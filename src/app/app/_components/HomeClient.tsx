"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TrackCard } from "@/components/cards";
import { usePlayerStore } from "@/stores/player";
import { trackEvent } from "@/lib/client-events";
import type { Track } from "@/types/music";

export default function HomeClient({
  initialItems,
  initialCursor,
  initialHasMore,
}: {
  initialItems: Track[];
  initialCursor: string | null;
  initialHasMore: boolean;
}) {
  const [items, setItems] = useState<Track[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState(false);
  const impressed = useRef<Set<string>>(new Set());
  const sentinel = useRef<HTMLDivElement | null>(null);
  const setQueue = usePlayerStore((s) => s.setQueue);

  const visibleTracks = items.filter((t) => t.id && !hidden.has(t.id));

  const refreshFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/home-feed?limit=60");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setItems(data.items as Track[]);
      setCursor(data.nextCursor as string | null);
      setHasMore(data.hasMore as boolean);
      impressed.current.clear();
      setHidden(new Set());
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Couldn't refresh the feed. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onRefresh = () => {
      void refreshFeed();
    };
    window.addEventListener("geet:refresh-wall" as keyof WindowEventMap, onRefresh);
    return () =>
      window.removeEventListener("geet:refresh-wall" as keyof WindowEventMap, onRefresh);
  }, [refreshFeed]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/home-feed?limit=48&cursor=${encodeURIComponent(cursor)}`
      );
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((t) => t.id).filter((x): x is string => !!x));
        const fresh = (data.items as Track[]).filter(
          (t) => t.id && !seen.has(t.id)
        );
        return [...prev, ...fresh];
      });
      setCursor(data.nextCursor as string | null);
      setHasMore(data.hasMore as boolean);
    } catch {
      setError("Couldn't load more songs. Try again.");
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor]);

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
  }, [loadMore, hasMore]);

  useEffect(() => {
    const list = items.filter((t) => t.id && !hidden.has(t.id));
    const report = () => {
      let sent = 0;
      for (const t of list) {
        if (!t.id || impressed.current.has(t.id)) continue;
        impressed.current.add(t.id);
        trackEvent({ eventType: "impression", trackId: t.id, source: "home_feed" });
        if (++sent >= 60) break;
      }
    };
    const timer = setTimeout(report, 600);
    return () => clearTimeout(timer);
  }, [items, hidden]);

  const handlePlay = (track: Track) => {
    if (!track.id) return;
    const queue = items.filter((t) => t.id && !hidden.has(t.id));
    const idx = queue.findIndex((t) => t.id === track.id);
    trackEvent({ eventType: "click", trackId: track.id, source: "home_feed" });
    setQueue(queue, idx >= 0 ? idx : 0);
    trackEvent({ eventType: "open", trackId: track.id, source: "home_feed" });
  };

  return (
    <div className="space-y-6">
      {flash && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          New for you — refreshed
        </div>
      )}

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
              trackEvent({ eventType: "like", trackId: t.id, source: "home_feed" });
            }}
            onNotInterested={
              t.id
                ? () => {
                    trackEvent({
                      eventType: "not_interested",
                      trackId: t.id as string,
                      source: "home_feed",
                    });
                    setHidden((prev) => new Set(prev).add(t.id as string));
                  }
                : undefined
            }
          />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinel} className="flex items-center justify-center py-10 text-sm text-muted">
          {loading ? "Loading more songs…" : "Scroll for more"}
        </div>
      )}

      {error && (
        <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => void (cursor ? loadMore() : refreshFeed())}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      )}

      {!hasMore && !error && (
        <p className="text-center text-sm text-muted">
          You&apos;ve reached the end — that&apos;s the whole catalog. Refresh to reshuffle.
        </p>
      )}

      {visibleTracks.length === 0 && (
        <p className="text-center text-sm text-muted">
          Nothing here — listen to something and your feed will fill up.
        </p>
      )}
    </div>
  );
}