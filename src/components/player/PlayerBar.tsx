"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
} from "lucide-react";
import { usePlayerStore } from "@/stores/player";
import { formatDuration, artworkFallback } from "@/lib/utils";
import { QueueDrawer } from "./QueueDrawer";

export function PlayerBar() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);

  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setMuted = usePlayerStore((s) => s.setMuted);
  const setShuffle = usePlayerStore((s) => s.setShuffle);
  const setRepeat = usePlayerStore((s) => s.setRepeat);

  const [queueOpen, setQueueOpen] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // heart state is derived from the playing track's like state in the store
  const liked = !!currentTrack?.isLiked;

  const effectiveDuration = duration || currentTrack?.durationSec || 0;
  const progressPct = effectiveDuration ? (currentTime / effectiveDuration) * 100 : 0;

  const handleLike = async () => {
    if (!currentTrack || likeLoading) return;
    const trackId = currentTrack.id;
    if (!trackId) return;
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/tracks/${trackId}/like`, {
        method: "POST",
      });
      if (res.ok) usePlayerStore.getState().setTrackLiked(!liked);
    } catch {
      // ignore
    } finally {
      setLikeLoading(false);
    }
  };

  const cycleRepeat = () => {
    if (repeat === "off") setRepeat("all");
    else if (repeat === "all") setRepeat("one");
    else setRepeat("off");
  };

  if (!currentTrack) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        {/* progress rail */}
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-border">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2 md:gap-4 md:px-4 md:py-3">
          {/* artwork + meta */}
          <div className="flex min-w-0 flex-1 items-center gap-3 md:max-w-[30%]">
            {currentTrack.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.thumbnailUrl}
                alt={currentTrack.title}
                onError={(e) => (e.currentTarget.style.display = "none")}
                className="h-11 w-11 shrink-0 rounded-md object-cover md:h-12 md:w-12"
              />
            ) : (
              <div
                className="h-11 w-11 shrink-0 rounded-md md:h-12 md:w-12"
                style={{ background: artworkFallback(currentTrack.title) }}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{currentTrack.title}</p>
              <p className="truncate text-xs text-muted">{currentTrack.artist}</p>
            </div>
            <button
              onClick={handleLike}
              disabled={likeLoading}
              aria-label={liked ? "Unlike" : "Like"}
              className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors md:inline-flex ${
                liked ? "text-primary" : "text-muted hover:text-foreground hover:bg-surface"
              }`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            </button>
          </div>

          {/* center controls */}
          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[420px]">
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => setShuffle(!shuffle)}
                aria-label="Shuffle"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  shuffle ? "text-primary bg-primary-soft" : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                onClick={prev}
                aria-label="Previous"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-surface transition-colors"
              >
                <SkipBack className="h-4 w-4 fill-current" />
              </button>
              <button
                onClick={toggle}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow"
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
              </button>
              <button
                onClick={() => next()}
                aria-label="Next"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-surface transition-colors"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </button>
              <button
                onClick={cycleRepeat}
                aria-label={`Repeat ${repeat}`}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  repeat !== "off" ? "text-primary bg-primary-soft" : "text-muted hover:text-foreground hover:bg-surface"
                }`}
              >
                {repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
              </button>
            </div>

            {/* progress slider */}
            <div className="hidden w-full items-center gap-2 md:flex">
              <span className="w-10 text-right text-[11px] tabular-nums text-muted">{formatDuration(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={effectiveDuration || 100}
                value={Math.min(currentTime, effectiveDuration || 100)}
                onChange={(e) => seek(Number(e.target.value))}
                className="h-1 flex-1 accent-primary"
                aria-label="Seek"
              />
              <span className="w-10 text-[11px] tabular-nums text-muted">{formatDuration(effectiveDuration)}</span>
            </div>
          </div>

          {/* right: volume + queue */}
          <div className="flex items-center gap-1 md:gap-2 flex-1 justify-end md:max-w-[30%]">
            {/* mobile like */}
            <button
              onClick={handleLike}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full md:hidden ${liked ? "text-primary" : "text-muted"}`}
              aria-label="Like"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            </button>

            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={() => setMuted(!muted)}
                aria-label={muted ? "Unmute" : "Mute"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  if (v > 0 && muted) setMuted(false);
                  if (v === 0) setMuted(true);
                }}
                className="w-20 accent-primary md:w-24"
                aria-label="Volume"
              />
            </div>

            <button
              onClick={() => setQueueOpen(true)}
              aria-label="Open queue"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-surface transition-colors"
            >
              <ListMusic className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* mobile progress slider */}
        <div className="flex items-center gap-2 px-3 pb-2 md:hidden">
          <span className="text-[11px] tabular-nums text-muted">{formatDuration(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={effectiveDuration || 100}
            value={Math.min(currentTime, effectiveDuration || 100)}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-1 flex-1 accent-primary"
            aria-label="Seek"
          />
          <span className="text-[11px] tabular-nums text-muted">{formatDuration(effectiveDuration)}</span>
        </div>
      </div>

      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
    </>
  );
}

export default PlayerBar;
