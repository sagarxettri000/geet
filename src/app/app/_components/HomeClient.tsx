"use client";

import { useEffect, useMemo, useState } from "react";
import { TrackCard } from "@/components/cards";
import { usePlayerStore } from "@/stores/player";
import { trackEvent } from "@/lib/client-events";
import type { Track } from "@/types/music";

type Section = {
  key: string;
  title: string;
  subtitle?: string;
  items: unknown[];
};

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className="text-base font-semibold leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 -mx-1 px-1">
      {children}
    </div>
  );
}

function isTrack(x: unknown): x is Track {
  return !!x && typeof x === "object" && "title" in (x as Track) && "artist" in (x as Track);
}

export default function HomeClient({ sections }: { sections: Section[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const setQueue = usePlayerStore((s) => s.setQueue);

  const visibleFeed = useMemo(
    () => sections.map((sec) => ({ ...sec, items: sec.items.filter((it) => !hidden.has((it as Track).id ?? "")) })),
    [sections, hidden]
  );

  useEffect(() => {
    const impressionIds: string[] = [];
    let count = 0;
    for (const sec of sections) {
      for (const it of sec.items) {
        const t = it as Track;
        if (t?.id && count < 120) {
          impressionIds.push(t.id);
          count++;
        }
      }
    }
    const t = setTimeout(() => {
      for (const id of impressionIds) {
        trackEvent({ eventType: "impression", trackId: id, source: "home_feed" });
      }
    }, 800);
    return () => clearTimeout(t);
  }, [sections]);

  return (
    <div className="space-y-8">
      {visibleFeed.map((sec) => {
        const tracks: Track[] = sec.items.filter(isTrack);
        if (tracks.length === 0) return null;

        return (
          <section key={sec.key}>
            <SectionHeader title={sec.title} subtitle={sec.subtitle} />
            <Carousel>
              {tracks.map((t, i) => (
                <div key={(t.id ?? t.title) + i} className="w-[168px] shrink-0 snap-start">
                  <TrackCard
                    track={t}
                    isLiked={t.isLiked}
                    onPlay={() => {
                      if (t.id) trackEvent({ eventType: "click", trackId: t.id, source: "home_feed" });
                      setQueue(tracks, i);
                      if (t.id) trackEvent({ eventType: "open", trackId: t.id, source: "home_feed" });
                    }}
                    onLike={async () => {
                      if (!t.id) return;
                      await fetch(`/api/tracks/${t.id}/like`, { method: "POST" });
                      trackEvent({ eventType: "like", trackId: t.id, source: "home_feed" });
                    }}
                    onNotInterested={
                      t.id
                        ? () => {
                            trackEvent({ eventType: "not_interested", trackId: t.id as string, source: "home_feed" });
                            setHidden((prev) => new Set(prev).add(t.id as string));
                          }
                        : undefined
                    }
                  />
                </div>
              ))}
            </Carousel>
          </section>
        );
      })}

      {visibleFeed.every((sec) => (sec.items as unknown[]).length === 0) && (
        <p className="text-center text-sm text-muted">Nothing here — listen to something and your feed will adapt.</p>
      )}
    </div>
  );
}