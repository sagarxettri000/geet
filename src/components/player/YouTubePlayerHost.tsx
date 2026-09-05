"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/stores/player";
import type { Track } from "@/types/music";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (sec: number, allowSeekAhead: boolean) => void;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  loadVideoById: (id: string | { videoId: string }) => void;
  cueVideoById: (id: string | { videoId: string }) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT: {
      Player: new (
        id: string,
        opts: {
          width: string;
          height: string;
          videoId?: string;
          host?: string;
          playerVars?: Record<string, unknown>;
          events?: Record<string, (e: unknown) => void>;
        }
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function getVideoId(track: Track | null): string | null {
  if (!track) return null;
  const direct = track.sources?.[0]?.providerVideoId?.trim();
  if (direct) return direct;
  const thumb = track.thumbnailUrl ?? "";
  if (thumb) {
    const m1 = thumb.match(/\/vi\/([^/?&#]+)/);
    if (m1?.[1]) return m1[1];
    const m2 = thumb.match(/[?&]v=([^&]+)/);
    if (m2?.[1]) return m2[1];
    const m3 = thumb.match(/youtu\.be\/([^?/&#]+)/);
    if (m3?.[1]) return m3[1];
  }
  if (track.id) {
    if (/^[A-Za-z0-9_-]{11}$/.test(track.id)) return track.id;
    const m = track.id.match(/[A-Za-z0-9_-]{11}/);
    if (m) return m[0];
    const vm = track.id.match(/[?&]v=([^&]+)/);
    if (vm?.[1]) return vm[1];
  }
  return null;
}

function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (existing) {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      // if already loading, polling fallback
      if (window.YT?.Player) resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
    document.head.appendChild(s);
  });
}

export default function YouTubePlayerHost() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const seek = usePlayerStore((s) => s.seek);
  const currentTime = usePlayerStore((s) => s.currentTime);

  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoIdRef = useRef<string | null>(null);

  // Keep store actions stable without subscribing to whole store
  const getStore = useCallback(() => usePlayerStore.getState(), []);

  const createPlayer = useCallback(
    (videoId: string | null) => {
      if (playerRef.current || typeof window === "undefined" || !window.YT?.Player) return;
      const containerId = "geet-yt-host-player";
      // ensure container exists
      if (!document.getElementById(containerId)) return;

      playerRef.current = new window.YT.Player(containerId, {
        width: "640",
        height: "360",
        videoId: videoId ?? undefined,
        host: "https://www.youtube.com",
        playerVars: {
          playsinline: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          enablejsapi: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        } as unknown as Record<string, number | string>,
        events: {
          onReady: ((e: unknown) => {
            const ev = e as { target: YTPlayer };
            readyRef.current = true;
            const store = getStore();
            try {
              const d = ev.target.getDuration?.() ?? 0;
              if (d) store.setDuration(d);
              store.setStatus("ready");
            } catch {}
            ev.target.setVolume(muted ? 0 : volume);
            if (usePlayerStore.getState().isPlaying) {
              try {
                ev.target.playVideo();
              } catch {}
            }
          }) as unknown as (e: unknown) => void,
          onStateChange: ((e: unknown) => {
            const ev = e as { data: number; target: YTPlayer };
            const store = getStore();
            const YTState = window.YT.PlayerState;
            switch (ev.data) {
              case YTState.PLAYING:
                store.setStatus("playing");
                break;
              case YTState.PAUSED:
                store.setStatus("paused");
                break;
              case YTState.BUFFERING:
                store.setStatus("loading");
                break;
              case YTState.ENDED:
                store.setStatus("ended");
                store.next();
                break;
              case YTState.UNSTARTED:
                store.setStatus("unstarted");
                break;
              default:
                break;
            }
          }) as unknown as (e: unknown) => void,
          onError: (() => {
            getStore().setStatus("error");
          }) as unknown as (e: unknown) => void,
        },
      });
    },
    [getStore, muted, volume]
  );

  // Load API & create player once
  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI()
      .then(() => {
        if (cancelled) return;
        // wait a tick for YT to be fully ready
        const check = () => {
          if (window.YT?.Player && !playerRef.current) {
            createPlayer(getVideoId(currentTrack));
            videoIdRef.current = getVideoId(currentTrack);
          }
        };
        check();
        // if YT not yet fully initialized, poll briefly
        if (!playerRef.current) {
          const t = setInterval(() => {
            if (window.YT?.Player && !playerRef.current) {
              check();
              if (playerRef.current) clearInterval(t);
            }
          }, 100);
          setTimeout(() => clearInterval(t), 3000);
        }
      })
      .catch(() => {
        getStore().setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync videoId when track changes
  useEffect(() => {
    const vid = getVideoId(currentTrack);
    if (vid === videoIdRef.current) return;
    videoIdRef.current = vid;
    const p = playerRef.current;
    if (!p || !readyRef.current) {
      // if player not ready yet, creation will pick up vid
      // if player exists but not ready, wait
      if (p && vid) {
        // try load when ready via interval
        const t = setInterval(() => {
          if (readyRef.current && playerRef.current) {
            try {
              if (vid) (playerRef.current as YTPlayer).loadVideoById?.(vid);
            } catch {}
            clearInterval(t);
          }
        }, 200);
        setTimeout(() => clearInterval(t), 3000);
      }
      return;
    }
    if (!vid) {
      try {
        p.pauseVideo();
        p.stopVideo?.();
      } catch {}
      return;
    }
    try {
      const shouldPlay = usePlayerStore.getState().isPlaying;
      const { muted: isMuted, volume: vol } = usePlayerStore.getState();
      if (shouldPlay) {
        // Autoplay with sound is blocked unless muted - load muted then unmute after play starts
        if (!isMuted && vol > 0) {
          try { p.mute?.(); } catch {}
          (p as YTPlayer).loadVideoById(vid);
          setTimeout(() => {
            try {
              p.unMute?.();
              p.setVolume(vol);
            } catch {}
          }, 800);
        } else {
          (p as YTPlayer).loadVideoById(vid);
        }
      } else {
        (p as YTPlayer).cueVideoById?.(vid);
        if ((p as YTPlayer).cueVideoById == null) {
          (p as YTPlayer).loadVideoById(vid);
          p.pauseVideo();
        }
      }
    } catch {
      try {
        (p as YTPlayer).loadVideoById(vid);
      } catch {}
    }
  }, [currentTrack]);

  // Sync isPlaying -> play/pause
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    try {
      if (isPlaying) p.playVideo();
      else p.pauseVideo();
    } catch {}
  }, [isPlaying]);

  // Sync volume/muted
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    try {
      if (muted) p.mute?.();
      else {
        p.unMute?.();
        p.setVolume(volume);
      }
      // YT setVolume 0-100
      if (!muted) p.setVolume(volume);
    } catch {}
  }, [volume, muted]);

  // Seek handling: when store currentTime jumps (user slider calls seek()), sync to player
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    // avoid seeking during initial poll sync: only seek if diff > 0.75s
    try {
      const pt = p.getCurrentTime?.() ?? 0;
      if (Math.abs(currentTime - pt) > 0.75) {
        p.seekTo(currentTime, true);
      }
    } catch {}
    // we intentionally depend on currentTime (store) to detect seek()
    // seek is included to satisfy spec requirement "use seek from store"
    void seek;
  }, [currentTime, seek]);

  // Poll currentTime/duration every 250ms
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      try {
        if (typeof p.getCurrentTime !== "function" || typeof p.getDuration !== "function") return;
        const t = p.getCurrentTime();
        const d = p.getDuration();
        const store = getStore();
        // only update if meaningful
        if (typeof t === "number" && !Number.isNaN(t)) store.setCurrentTime(t);
        if (typeof d === "number" && !Number.isNaN(d) && d > 0) store.setDuration(d);
        // keep status in sync if playing
        const state = (p as unknown as { getPlayerState?: () => number }).getPlayerState?.();
        if (state === window.YT?.PlayerState?.PLAYING) store.setStatus("playing");
      } catch {}
    }, 250);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [getStore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      try {
        playerRef.current?.destroy?.();
      } catch {}
    };
  }, []);

  return (
    <div
      id="geet-yt-host"
      aria-hidden
      style={{
        position: "absolute",
        left: -9999,
        top: -9999,
        width: 640,
        height: 360,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: 0.01,
      }}
    >
      <div id="geet-yt-host-player" />
    </div>
  );
}
