import { create } from "zustand";
import type { Track, RepeatMode, PlayerStatus } from "@/types/music";

interface PlayerState {
  queue: Track[];
  index: number;
  status: PlayerStatus;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  muted: boolean;
  currentTime: number;
  duration: number;
  currentTrack: Track | null;
  queueId: string | null;
  debugInfo: string;
  reloadNonce: number;
}

interface PlayerActions {
  setQueue: (tracks: Track[], startIndex?: number, queueId?: string | null) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: (opts?: { auto?: boolean }) => void;
  prev: () => void;
  seek: (sec: number) => void;
  setStatus: (s: PlayerStatus) => void;
  setCurrentTime: (sec: number) => void;
  setDuration: (sec: number) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setShuffle: (v: boolean) => void;
  setRepeat: (m: RepeatMode) => void;
  playTrack: (track: Track) => void;
  setTrackLiked: (liked: boolean) => void;
  removeFromQueue: (idx: number) => void;
  clearQueue: () => void;
  setDebugInfo: (info: string) => void;
  requestPlayerReload: () => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  queue: [],
  index: 0,
  status: "idle",
  isPlaying: false,
  shuffle: false,
  repeat: "off",
  volume: 80,
  muted: false,
  currentTime: 0,
  duration: 0,
  currentTrack: null,
  queueId: null,
  debugInfo: "",
  reloadNonce: 0,

  setQueue: (tracks, startIndex = 0, queueId = null) =>
    set({
      queue: tracks,
      index: Math.max(0, Math.min(startIndex, tracks.length - 1)),
      currentTrack: tracks[startIndex] ?? null,
      queueId,
      status: tracks.length ? "loading" : "idle",
      isPlaying: tracks.length > 0,
      currentTime: 0,
      duration: 0,
    }),

  play: () => set({ isPlaying: true, status: "playing" }),
  pause: () => set({ isPlaying: false, status: "paused" }),
  toggle: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying, status: !isPlaying ? "playing" : "paused" });
  },

  next: (opts?: { auto?: boolean }) => {
    const auto = opts?.auto ?? false;
    const { queue, index, repeat, shuffle } = get();
    if (!queue.length) return;
    // "repeat one" only loops the same track on natural end (auto),
    // never when the user presses skip.
    if (repeat === "one" && auto) {
      set({ currentTime: 0, status: "playing", isPlaying: true });
      return;
    }
    if (shuffle && queue.length > 1) {
      let nextIdx = Math.floor(Math.random() * queue.length);
      if (nextIdx === index) nextIdx = (nextIdx + 1) % queue.length;
      set({
        index: nextIdx,
        currentTrack: queue[nextIdx],
        currentTime: 0,
        duration: 0,
        status: "loading",
        isPlaying: true,
      });
      return;
    }
    const nextIdx = index + 1;
    if (nextIdx >= queue.length) {
      if (repeat === "all") {
        set({
          index: 0,
          currentTrack: queue[0],
          currentTime: 0,
          duration: 0,
          status: "playing",
          isPlaying: true,
        });
      } else {
        set({ isPlaying: false, status: "ended" });
      }
      return;
    }
    set({
      index: nextIdx,
      currentTrack: queue[nextIdx],
      currentTime: 0,
      duration: 0,
      status: "loading",
      isPlaying: true,
    });
  },

  prev: () => {
    const { queue, index, currentTime } = get();
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    const prevIdx = Math.max(0, index - 1);
    set({
      index: prevIdx,
      currentTrack: queue[prevIdx] ?? null,
      currentTime: 0,
      duration: 0,
      status: "loading",
      isPlaying: true,
    });
  },

  seek: (sec) => set({ currentTime: sec }),
  setStatus: (s) => set({ status: s }),
  setCurrentTime: (sec) => set({ currentTime: sec }),
  setDuration: (sec) => set({ duration: sec }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(100, v)), muted: v === 0 ? true : get().muted }),
  setMuted: (m) => set({ muted: m }),
  setShuffle: (v) => set({ shuffle: v }),
  setRepeat: (m) => set({ repeat: m }),

  playTrack: (track) =>
    set({
      queue: [track],
      index: 0,
      currentTrack: track,
      status: "loading",
      isPlaying: true,
      currentTime: 0,
      duration: 0,
      queueId: null,
    }),

  setTrackLiked: (liked) =>
    set((s) => ({
      currentTrack: s.currentTrack ? { ...s.currentTrack, isLiked: liked } : s.currentTrack,
      queue: s.queue.map((t, i) => (i === s.index ? { ...t, isLiked: liked } : t)),
    })),

  removeFromQueue: (idx) =>
    set((s) => {
      const q = s.queue.filter((_, i) => i !== idx);
      let newIdx = s.index;
      if (idx < s.index) newIdx = Math.max(0, s.index - 1);
      if (idx === s.index) {
        return {
          queue: q,
          index: Math.min(newIdx, Math.max(0, q.length - 1)),
          currentTrack: q[newIdx] ?? q[0] ?? null,
          isPlaying: q.length ? s.isPlaying : false,
          status: q.length ? s.status : "idle",
        };
      }
      return { queue: q, index: newIdx };
    }),

  clearQueue: () =>
    set({ queue: [], index: 0, currentTrack: null, status: "idle", isPlaying: false }),

  setDebugInfo: (info) => set({ debugInfo: info }),
  requestPlayerReload: () => set({ reloadNonce: Date.now() }),
}));