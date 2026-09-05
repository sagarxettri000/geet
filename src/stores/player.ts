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
  next: () => void;
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
  addToQueue: (track: Track) => void;
  removeFromQueue: (idx: number) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  setDebugInfo: (info: string) => void;
  requestPlayerReload: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

  next: () => {
    const { queue, index, repeat, shuffle } = get();
    if (!queue.length) return;
    if (repeat === "one") {
      set({ currentTime: 0, status: "playing", isPlaying: true });
      return;
    }
    if (shuffle && queue.length > 1) {
      const nextIdx = Math.floor(Math.random() * queue.length);
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

  addToQueue: (track) =>
    set((s) => ({
      queue: [...s.queue, track],
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

  shuffleQueue: () =>
    set((s) => {
      if (s.queue.length <= 1) return {};
      const current = s.queue[s.index];
      const rest = s.queue.filter((_, i) => i !== s.index);
      const shuffled = shuffleArray(rest);
      const newQueue = [current, ...shuffled];
      return { queue: newQueue, index: 0, currentTrack: current };
    }),

  setDebugInfo: (info) => set({ debugInfo: info }),
  requestPlayerReload: () => set({ reloadNonce: Date.now() }),
}));