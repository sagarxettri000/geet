"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TrackCard } from "@/components/cards";
import { usePlayerStore } from "@/stores/player";
import { trackEvent } from "@/lib/client-events";
import type { Track } from "@/types/music";

export default function HomeClient({
  initialItems,
  initialNextOffset,
  initialHasMore,
  variant,
}: {
  initialItems: Track[];
  initialNextOffset: number;
  initialHasMore: boolean;
  variant: string;
}) {
  const [items, setItems] = useState<Track[]>(initialItems);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const impressed = useRef<Set<string>>(new Set());
  const sentinel = useRef<HTMLDivElement | null>(null);
  const setQueue = usePlayerStore((s) => s.setQueue);

  const visibleTracks = items.filter((t) => t.id && !hidden.has(t.id));

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/wall?offset=${nextOffset}&limit=48&variant=${encodeURIComponent(variant)}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((t) => t.id).filter((x): x is string => !!x));
        const fresh = (data.items as Track[]).filter((t) => t.id && !seen.has(t.id));
        return [...prev, ...fresh];
      });
      setNextOffset(data.nextOffset as number);
      setHasMore(data.hasMore as boolean);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, nextOffset, variant]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "1200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  useEffect(() => {
    const list = items.filter((t) => t.id && !hidden.has(t.id));
    const report = () => {
      let sent = 0;
      for (const t of list) {
        if (!t.id || impressed.current.has(t.id)) continue;
        impressed.current.add(t.id);
        trackEvent({ eventType: "impression", trackId: t.id, source: "home_wall" });
        if (++sent >= 60) break;
      }
    };
    const timer = setTimeout(report, 600);
    return () => clearTimeout(timer);
  }, [items, hidden]);

  const handlePlay = (track: Track) => {
    if (!track.id) return;
    trackEvent({ eventType: "click", trackId: track.id, source: "home_wall" });
    const queue = items;
    const idx = queue.findIndex((t) => t.id === track.id);
    setQueue(queue, idx >= 0 ? idx : 0);
    trackEvent({ eventType: "open", trackId: track.id, source: "home_wall" });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visibleTracks.map((t) => (
          <TrackCard
            key={t.id ?? t.title}
            track={t}
            isLiked={t.isLiked}
            onPlay={() => handlePlay(t)}
            onLike={async () => {
              if (!t.id) return;
              await fetch(`/api/tracks/${t.id}/like`, { method: "POST" });
              trackEvent({ eventType: "like", trackId: t.id, source: "home_wall" });
            }}
            onNotInterested={
              t.id
                ? () => {
                    trackEvent({ eventType: "not_interested", trackId: t.id as string, source: "home_wall" });
                    setHidden((prev) => new Set(prev).add(t.id as string));
                  }
                : undefined
            }
          />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinel} className="flex items-center justify-center py-10 text-sm text-muted">
          {loading ? "Loading…" : "Scroll for more"}
        </div>
      )}

      {visibleTracks.length === 0 && (
        <p className="text-center text-sm text-muted">Nothing here — listen to something and your wall will fill up.</p>
      )}
    </div>
  );
}