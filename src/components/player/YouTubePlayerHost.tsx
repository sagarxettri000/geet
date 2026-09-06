"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/stores/player";
import { trackEvent } from "@/lib/client-events";
import { readConsent, writeConsent } from "@/lib/consent";
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
  }
}

let hostBusy = false;

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

/** Mute before autoplaying so the browser can't block a gesture-less playback,
 *  then unmute the instant the player actually reaches PLAYING state. */
let pendingUnmute = false;

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
  const lastPlayRef = useRef<string | null>(null);

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
      if (st.muted || st.volume === 0 || !pendingUnmute) return;
      const state = p.getPlayerState?.();
      if (state === window.YT?.PlayerState?.PLAYING) {
        pendingUnmute = false;
        p.unMute?.();
        p.setVolume(st.volume);
        log("unmute-on-playing");
      }
    } catch {}
  }, [getStore]);

  /** Watchdog: if the PLAYING event is missed, unmute once the player is audibly playing. */
  const safetyUnmute = useCallback(() => {
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
  }, [getStore]);

  /** Start a given video on an existing, ready player. */
  const playVideoOn = useCallback(
    (p: YTPlayer, vid: string) => {
      const st = getStore();
      if (st.isPlaying) {
        armMutedPlay(p, st);
        p.loadVideoById(vid);
        safetyUnmute();
      } else {
        p.cueVideoById?.(vid);
      }
    },
    [getStore, safetyUnmute]
  );

  /** Create the player lazily with a real video id (never undefined!). */
  const ensurePlayer = useCallback(
    (videoId: string): YTPlayer | null => {
      if (playerRef.current) return playerRef.current;
      if (typeof window === "undefined" || !window.YT?.Player) return null;
      const containerId = "geet-yt-host-player";
      if (!document.getElementById(containerId)) {
        debug("no-container");
        return null;
      }
      debug("creating");
      log("creating player", videoId);
      try {
        const p = new window.YT.Player(containerId, {
          width: "480",
          height: "270",
          videoId,
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
              // load whatever track is pending (typical case: player created from a play click)
              const queued = videoIdRef.current;
              if (queued) {
                playVideoOn(ev.target, queued);
              }
              try {
                if (st.isPlaying) ev.target.playVideo();
              } catch {}
            }) as unknown as (e: unknown) => void,
            onStateChange: ((e: unknown) => {
              const ev = e as { data: number; target: YTPlayer };
              const store = getStore();
              const YTState = window.YT.PlayerState;
              const st = store;
              switch (ev.data) {
                case YTState.PLAYING: {
                  st.setStatus("playing");
                  debug("playing");
                  unmuteIfPlaying();
                  const trackId = st.currentTrack?.id;
                  if (trackId && lastPlayRef.current !== trackId) {
                    lastPlayRef.current = trackId;
                    const dur = typeof ev.target.getDuration === "function" ? Math.floor(ev.target.getDuration()) : undefined;
                    trackEvent({ eventType: "play_start", trackId, duration: dur, source: "player" });
                  }
                  break;
                }
                case YTState.PAUSED: {
                  st.setStatus("paused");
                  debug("paused");
                  const trackId = st.currentTrack?.id;
                  if (trackId) {
                    trackEvent({
                      eventType: "pause",
                      trackId,
                      position: typeof ev.target.getCurrentTime === "function" ? Math.floor(ev.target.getCurrentTime()) : undefined,
                      source: "player",
                    });
                  }
                  break;
                }
                case YTState.BUFFERING:
                  st.setStatus("loading");
                  debug("loading");
                  break;
                case YTState.ENDED: {
                  st.setStatus("ended");
                  debug("ended");
                  const trackId = st.currentTrack?.id;
                  if (trackId) {
                    const dur = typeof ev.target.getDuration === "function" ? Math.floor(ev.target.getDuration()) : undefined;
                    trackEvent({ eventType: "complete", trackId, duration: dur, position: dur, source: "player" });
                    lastPlayRef.current = null;
                  }
                  st.next({ auto: true });
                  break;
                }
                case YTState.UNSTARTED:
                  st.setStatus("unstarted");
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
        playerRef.current = p;
        return p;
      } catch (err) {
        log("create failed", err);
        debug("create-failed");
        playerRef.current = null;
        getStore().setStatus("error");
        return null;
      }
    },
    [getStore, debug, syncVolume, unmuteIfPlaying, playVideoOn]
  );

  const destroyPlayer = useCallback(() => {
    try {
      playerRef.current?.destroy?.();
    } catch {}
    playerRef.current = null;
    readyRef.current = false;
    videoIdRef.current = null;
    pendingUnmute = false;
    if (hostBusy) {
      hostBusy = false;
    }
  }, []);

  const bootstrap = useCallback(
    (vid: string) => {
      // Wait for the YouTube API + a container, then create the player once.
      if (playerRef.current) return;
      tryBootstrapRef.current = true;
      const created = ensurePlayer(vid);
      if (created) {
        // creation succeeded; onReady will load due to videoIdRef
        return;
      }
      // API not loaded yet (script load was deferred until this play action) —
      // load it, then create the player once it's ready.
      if (!window.YT?.Player) {
        void loadYouTubeAPI().then(() => {
          if (playerRef.current) return;
          const p = ensurePlayer(vid);
          if (p) {
            if (readyRef.current) playVideoOn(p, vid);
          }
        });
        return;
      }
      // API still loading or creation raced — poll until we can
      const t = setInterval(() => {
        if (window.YT?.Player && !playerRef.current) {
          const p = ensurePlayer(vid);
          if (p) {
            clearInterval(t);
            if (readyRef.current) playVideoOn(p, vid);
          }
        } else if (playerRef.current) {
          clearInterval(t);
          if (!readyRef.current) {
            const t2 = setInterval(() => {
              if (readyRef.current && playerRef.current && videoIdRef.current) {
                playVideoOn(playerRef.current, videoIdRef.current);
                clearInterval(t2);
              }
            }, 200);
            setTimeout(() => clearInterval(t2), 5000);
          } else if (videoIdRef.current) {
            playVideoOn(playerRef.current, videoIdRef.current);
          }
        }
      }, 150);
      setTimeout(() => clearInterval(t), 6000);
    },
    [ensurePlayer, playVideoOn]
  );
  const tryBootstrapRef = useRef(false);

  // Load the YouTube IFrame API once (no player creation here!). We defer
  // this third-party script load until a consent choice exists (or the user's
  // first play action, handled by bootstrap) so no YouTube code runs before
  // the user has been informed.
  useEffect(() => {
    let cancelled = false;
    const consent = readConsent();
    if (!consent || consent.youtube === false) {
      debug("api-deferred");
      return;
    }
    if (hostBusy) return;
    hostBusy = true;
    loadYouTubeAPI().then((ok) => {
      if (cancelled || hostBusy === false) return;
      if (!ok) {
        debug("api-load-failed");
        log("YouTube IFrame API failed to load");
        getStore().setStatus("error");
        return;
      }
      debug("api-ok");
      log("api ok");
    });
    return () => {
      cancelled = true;
    };
  }, [debug, getStore]);

  // Recreate player on explicit reload request
  useEffect(() => {
    if (!reloadNonce) return;
    destroyPlayer();
    debug("recreating");
    log("recreating player", reloadNonce);
    const vid = getVideoId(currentTrack);
    videoIdRef.current = vid;
    if (vid) bootstrap(vid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadNonce]);

  // Sync videoId when track changes — this is where the player gets born.
  useEffect(() => {
    const vid = getVideoId(currentTrack);
    if (!vid) {
      videoIdRef.current = null;
      const p = playerRef.current;
      if (p && readyRef.current) {
        try { p.pauseVideo(); p.stopVideo?.(); } catch {}
      }
      return;
    }
    const sameVideo = vid === videoIdRef.current;
    videoIdRef.current = vid;
    if (!readConsent()) writeConsent({ state: "accepted" });
    log("track change", vid, "same:", sameVideo, "player:", !!playerRef.current, "ready:", readyRef.current);
    const p = playerRef.current;
    if (p && readyRef.current) {
      if (sameVideo) {
        // re-clicking the same song — just make sure it's actually playing
        const st = usePlayerStore.getState();
        if (st.isPlaying) { p.playVideo(); if (pendingUnmute) unmuteIfPlaying(); }
        return;
      }
      playVideoOn(p, vid);
      return;
    }
    if (!p && !tryBootstrapRef.current) {
      bootstrap(vid);
      return;
    }
    if (p && !readyRef.current) {
      // wait for ready, then load on rollover
      const t = setInterval(() => {
        if (readyRef.current && playerRef.current && videoIdRef.current) {
          playVideoOn(playerRef.current, videoIdRef.current);
          clearInterval(t);
        }
      }, 200);
      setTimeout(() => clearInterval(t), 5000);
    }
  }, [currentTrack, getStore, bootstrap, playVideoOn, unmuteIfPlaying]);

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
        pendingUnmute = false;
      } else if (pendingUnmute) {
        p.setVolume(volume);
      } else {
        p.unMute?.();
        p.setVolume(volume);
      }
    } catch {}
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
      if (hostBusy) {
        hostBusy = false;
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