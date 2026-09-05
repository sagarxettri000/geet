"use client";

import { usePlayerStore } from "@/stores/player";
import { X, Trash2, Trash } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface QueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function QueueDrawer({ open, onClose }: QueueDrawerProps) {
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const queueId = usePlayerStore((s) => s.queueId);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <button
        aria-label="Close queue"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      {/* panel */}
      <div className="relative flex h-full w-full max-w-[380px] flex-col bg-background-elevated border-l border-border shadow-float">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold tracking-wide">Queue</h2>
          <div className="flex items-center gap-1">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium hover:bg-surface transition-colors"
                title="Clear queue"
              >
                <Trash className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {queue.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">Queue is empty</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {queue.map((track, i) => {
                const isCurrent = i === index && track.title === currentTrack?.title;
                const videoId = track.sources?.[0]?.providerVideoId ?? track.id ?? "";
                return (
                  <li
                    key={`${videoId}-${i}`}
                    className={`group flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isCurrent ? "bg-primary-soft" : "hover:bg-surface"
                    }`}
                  >
                    <button
                      onClick={() => setQueue(queue, i, queueId)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {track.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={track.thumbnailUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-md bg-surface" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-medium leading-tight ${
                            isCurrent ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {track.title}
                        </span>
                        <span className="block truncate text-xs text-muted">{track.artist}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-2">
                        {formatDuration(track.durationSec)}
                      </span>
                    </button>
                    <button
                      onClick={() => removeFromQueue(i)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-surface-elevated transition"
                      aria-label={`Remove ${track.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {queue.length > 0 && (
          <div className="border-t border-border px-4 py-3 text-xs text-muted">
            {queue.length} track{queue.length !== 1 ? "s" : ""} • {formatDuration(currentTrack?.durationSec)} playing
          </div>
        )}
      </div>
    </div>
  );
}

export default QueueDrawer;
