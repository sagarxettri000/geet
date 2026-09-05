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
  isMuted: () => boolean;
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
    __geetHost?: boolean;
  }
}

const YT_ERROR_TEXT: Record<number, string> = {
  2: "invalid-param",
  5: "html5-error",
  100: "video-removed",
  101: "embedding-disallowed",
  150: "embedding-disallowed",
};

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[GEET]", ...args);
}

function getVideoId(track: Track | null): string | null {
  if (!track) return null;
  const direct = track.sources?.[0]?.providerVideoId?.trim();
  if (direct && /^[A-Za-z0-9_-]{11}$/.test(direct)) return direct;
  const thumb = track.thumbnailUrl ?? "";
  if (thumb) {
    const m1 = thumb.match(/\/vi\/([^/?&#]+)/);
    if (m1?.[1] && /^[A-Za-z0-9_-]{11}$/.test(m1[1])) return m1[1];
    const m2 = thumb.match(/[?&]v=([^&]+)/);
    if (m2?.[1] && /^[A-Za-z0-9_-]{11}$/.test(m2[1])) return m2[1];
    const m3 = thumb.match(/youtu\.be\/([^?/&#]+)/);
    if (m3?.[1] && /^[A-Za-z0-9_-]{11}$/.test(m3[1])) return m3[1];
  }
  if (track.id && /^[A-Za-z0-9_-]{11}$/.test(track.id)) return track.id;
  return null;
}

function loadYouTubeAPI(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.YT?.Player) return Promise.resolve(true);
  return new Promise((resolve) => {
    let attempt = 0;
    const start = () => {
      attempt += 1;
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]'
      );
      if (existing) {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prev?.();
          if (window.YT?.Player) resolve(true);
        };
        if (window.YT?.Player) return resolve(true);
        return;
      }
      const timeout = setTimeout(() => {
        if (window.YT?.Player) return resolve(true);
        if (attempt < 5) return start();
        resolve(false);
      }, 2000);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        prev?.();
        if (window.YT?.Player) resolve(true);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => {
        clearTimeout(timeout);
        if (attempt < 5) start();
        else resolve(false);
      };
      document.head.appendChild(s);
    };
    start();
  });
}

/** Start the desired video. When the user wants sound, we start muted so
 *  autoplay policies can't block us, then unmute the moment playback starts. */
function armMutedPlay(p: YTPlayer, st: { muted: boolean; volume: number }): boolean {
  if (!st.muted && st.volume > 0) {
    pendingUnmute = true;
    try {
      p.mute?.();
      p.setVolume(st.volume);
    } catch {}
    return true;
  }
  return false;
}

let pendingUnmute = false;
declare global {
  // eslint-disable-next-line no-var
  var __geetHostBusy: boolean | undefined;
}

export default function YouTubePlayerHost() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const seek = usePlayerStore((s) => s.seek);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const reloadNonce = usePlayerStore((s) => s.reloadNonce);

  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoIdRef = useRef<string | null>(null);

  const getStore = useCallback(() => usePlayerStore.getState(), []);
  const debug = useCallback(
    (msg: string) => getStore().setDebugInfo(msg),
    [getStore]
  );

  const syncVolume = useCallback(
    (p: YTPlayer) => {
      const st = getStore();
      try {
        if (st.muted || st.volume === 0) {
          p.mute?.();
          p.setVolume(0);
        } else {
          p.unMute?.();
          p.setVolume(st.volume);
        }
      } catch {}
    },
    [getStore]
  );

  const unmuteIfPlaying = useCallback(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    try {
      const st = getStore();
      if (st.muted || st.volume === 0) return;
      if (pendingUnmute) {
        const state = p.getPlayerState?.();
        if (state === window.YT?.PlayerState?.PLAYING) {
          pendingUnmute = false;
          p.unMute?.();
          p.setVolume(st.volume);
          log("unmute-on-playing");
        }
      }
    } catch {}
  }, [getStore]);

  const createPlayer = useCallback(
    (videoId: string | null) => {
      if (playerRef.current || typeof window === "undefined" || !window.YT?.Player) return;
      const containerId = "geet-yt-host-player";
      if (!document.getElementById(containerId)) {
        debug("no-container");
        return;
      }
      debug("creating");
      log("creating player", videoId);
      try {
        playerRef.current = new window.YT.Player(containerId, {
          width: "480",
          height: "270",
          videoId: videoId ?? undefined,
          host: "https://www.youtube.com",
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            enablejsapi: 1,
            origin: window.location.origin,
          } as unknown as Record<string, number | string>,
          events: {
            onReady: ((e: unknown) => {
              const ev = e as { target: YTPlayer };
              readyRef.current = true;
              log("player ready");
              const st = getStore();
              try {
                const d = ev.target.getDuration?.() ?? 0;
                if (d) st.setDuration(d);
              } catch {}
              try {
                syncVolume(ev.target);
              } catch {}
              debug("ready");
              // If a track was queued before the player finished loading, load it now.
              try {
                const queued = videoIdRef.current;
                if (queued) {
                  if (st.isPlaying) {
                    armMutedPlay(ev.target, st);
                    ev.target.loadVideoById(queued);
                  } else {
                    ev.target.cueVideoById(queued);
                  }
                }
              } catch {}
              try {
                if (st.isPlaying) ev.target.playVideo();
              } catch {}
            }) as unknown as (e: unknown) => void,
            onStateChange: ((e: unknown) => {
              const ev = e as { data: number; target: YTPlayer };
              const store = getStore();
              const YTState = window.YT.PlayerState;
              switch (ev.data) {
                case YTState.PLAYING:
                  store.setStatus("playing");
                  debug("playing");
                  unmuteIfPlaying();
                  break;
                case YTState.PAUSED:
                  store.setStatus("paused");
                  debug("paused");
                  break;
                case YTState.BUFFERING:
                  store.setStatus("loading");
                  debug("loading");
                  break;
                case YTState.ENDED:
                  store.setStatus("ended");
                  debug("ended");
                  store.next();
                  break;
                case YTState.UNSTARTED:
                  store.setStatus("unstarted");
                  debug("unstarted");
                  break;
                default:
                  debug("st" + ev.data);
                  break;
              }
            }) as unknown as (e: unknown) => void,
            onError: ((e: unknown) => {
              const data = (e as { data?: number })?.data;
              const text = data != null ? YT_ERROR_TEXT[data] ?? String(data) : "?";
              log("player error", data);
              pendingUnmute = false;
              getStore().setStatus("error");
              debug(`err:${text}`);
            }) as unknown as (e: unknown) => void,
          },
        });
      } catch (err) {
        log("create failed", err);
        debug("create-failed");
        getStore().setStatus("error");
      }
    },
    [getStore, debug, syncVolume, unmuteIfPlaying]
  );

  const destroyPlayer = useCallback(() => {
    try {
      playerRef.current?.destroy?.();
    } catch {}
    playerRef.current = null;
    readyRef.current = false;
    videoIdRef.current = null;
    pendingUnmute = false;
    if (globalThis.__geetHostBusy) {
      globalThis.__geetHostBusy = false;
    }
  }, []);

  // Load API & create player once (StrictMode-safe via module flag)
  useEffect(() => {
    let cancelled = false;
    if (globalThis.__geetHostBusy) return;
    globalThis.__geetHostBusy = true;
    loadYouTubeAPI().then((ok) => {
      if (cancelled || globalThis.__geetHostBusy === false) return;
      if (!ok) {
        debug("api-load-failed");
        log("YouTube IFrame API failed to load");
        getStore().setStatus("error");
        return;
      }
      debug("api-ok");
      log("api ok");
      const vid = getVideoId(currentTrack);
      videoIdRef.current = vid;
      createPlayer(vid);
      // If the API global is set but the player globals need a tick, poll briefly.
      const t = setInterval(() => {
        if (window.YT?.Player && !playerRef.current) {
          createPlayer(getVideoId(currentTrack));
          if (playerRef.current) clearInterval(t);
        }
      }, 150);
      setTimeout(() => clearInterval(t), 4000);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPlayer]);

  // Recreate player on explicit reload request
  useEffect(() => {
    if (!reloadNonce) return;
    destroyPlayer();
    debug("recreating");
    log("recreating player", reloadNonce);
    const t = setInterval(() => {
      if (window.YT?.Player) {
        globalThis.__geetHostBusy = true;
        createPlayer(getVideoId(currentTrack));
        if (playerRef.current) clearInterval(t);
      }
    }, 150);
    setTimeout(() => clearInterval(t), 4000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadNonce]);

  // Sync videoId when track changes
  useEffect(() => {
    const vid = getVideoId(currentTrack);
    if (vid === videoIdRef.current) return;
    videoIdRef.current = vid;
    log("track change", vid);
    const p = playerRef.current;
    if (!p || !readyRef.current) {
      if (p && vid) {
        // roll over onto video once the player reports ready
        const t = setInterval(() => {
          if (readyRef.current && playerRef.current && videoIdRef.current) {
            try {
              const st = getStore();
              if (st.isPlaying) {
                armMutedPlay(playerRef.current, st);
                playerRef.current.loadVideoById(videoIdRef.current);
              } else {
                (playerRef.current as YTPlayer).cueVideoById?.(videoIdRef.current);
              }
            } catch {}
            clearInterval(t);
          }
        }, 200);
        setTimeout(() => clearInterval(t), 4000);
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
      const st = usePlayerStore.getState();
      if (st.isPlaying) {
        armMutedPlay(p, st);
        (p as YTPlayer).loadVideoById(vid);
      } else {
        (p as YTPlayer).cueVideoById?.(vid);
        if ((p as YTPlayer).cueVideoById == null) {
          (p as YTPlayer).loadVideoById(vid);
          p.pauseVideo();
        }
      }
      // Safety net: if the PLAYING event never reaches us, unmute once playing anyway.
      setTimeout(() => {
        try {
          if (pendingUnmute && readyRef.current && playerRef.current) {
            const state = playerRef.current.getPlayerState?.();
            if (state === window.YT?.PlayerState?.PLAYING) {
              pendingUnmute = false;
              playerRef.current.unMute?.();
              playerRef.current.setVolume(getStore().volume);
              log("unmute-safety");
            }
          }
        } catch {}
      }, 1500);
    } catch {
      try {
        (p as YTPlayer).loadVideoById(vid);
      } catch {}
    }
  }, [currentTrack, getStore, debug]);

  // Sync isPlaying -> play/pause
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    try {
      if (isPlaying) p.playVideo();
      else p.pauseVideo();
    } catch {}
  }, [isPlaying]);

  // Sync volume/muted — but DON'T unmute while a muted-autoplay is pending,
  // otherwise the browser blocks the autoplay-with-sound attempt.
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    try {
      if (muted || volume === 0) {
        p.mute?.();
        p.setVolume(0);
      } else if (pendingUnmute) {
        p.setVolume(volume);
      } else {
        p.unMute?.();
        p.setVolume(volume);
      }
    } catch {}
    void pendingUnmute;
  }, [volume, muted]);

  // Seek handling: when store currentTime jumps, sync to player
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    try {
      const pt = p.getCurrentTime?.() ?? 0;
      if (Math.abs(currentTime - pt) > 0.75 && videoIdRef.current) {
        p.seekTo(currentTime, true);
      }
    } catch {}
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
        if (typeof t === "number" && !Number.isNaN(t)) store.setCurrentTime(t);
        if (typeof d === "number" && !Number.isNaN(d) && d > 0) store.setDuration(d);
        const state = (p as unknown as { getPlayerState?: () => number }).getPlayerState?.();
        if (state === window.YT?.PlayerState?.PLAYING) {
          store.setStatus("playing");
          unmuteIfPlaying();
        }
        if (state === window.YT?.PlayerState?.PAUSED) store.setStatus("paused");
      } catch {}
    }, 250);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [getStore, unmuteIfPlaying]);

  // Heartbeat so we can see liveness while stuck
  useEffect(() => {
    heartbeatRef.current = setInterval(() => {
      const p = playerRef.current;
      log(
        "beat",
        p ? "player-yes" : "player-no",
        "ready:",
        readyRef.current,
        "state:",
        p ? p.getPlayerState?.() : "-",
        "vid:",
        videoIdRef.current
      );
    }, 4000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      try {
        playerRef.current?.destroy?.();
      } catch {}
      if (globalThis.__geetHostBusy) {
        globalThis.__geetHostBusy = false;
      }
    };
  }, []);

  return (
    <div
      id="geet-yt-host"
      aria-hidden
      style={{
        position: "fixed",
        left: 8,
        bottom: 130,
        width: 480,
        height: 270,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: 0.03,
        zIndex: 10,
      }}
    >
      <div id="geet-yt-host-player" />
    </div>
  );
}