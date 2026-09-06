"use client";

import { TrackCard } from "@/components/cards";
import { usePlayerStore } from "@/stores/player";
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

function TrackCarouselItems({ items }: { items: unknown[] }) {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const tracks: Track[] = items.filter(isTrack);

  if (tracks.length === 0) return null;

  return (
    <Carousel>
      {tracks.map((t, i) => (
        <div key={(t.id ?? t.title) + i} className="w-[168px] shrink-0 snap-start">
          <TrackCard
            track={t}
            isLiked={t.isLiked}
            onPlay={() => setQueue(tracks, i)}
            onLike={async () => {
              if (!t.id) return;
              await fetch(`/api/tracks/${t.id}/like`, { method: "POST" });
            }}
          />
        </div>
      ))}
    </Carousel>
  );
}

export default function HomeClient({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-8">
      {sections.map((sec) => {
        const items = sec.items;
        if (!items?.length) return null;

        return (
          <section key={sec.key}>
            <SectionHeader title={sec.title} subtitle={sec.subtitle} />
            <TrackCarouselItems items={items} />
          </section>
        );
      })}
    </div>
  );
}