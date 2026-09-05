"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Loader2 } from "lucide-react";
import { TrackCard } from "@/components/cards";
import { usePlayerStore } from "@/stores/player";
import { artworkFallback, formatDuration, formatCount, timeAgo } from "@/lib/utils";
import type { Track, Genre, YoutubeSearchHit } from "@/types/music";

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
function isGenre(x: unknown): x is Genre {
  return !!x && typeof x === "object" && "slug" in (x as Genre);
}
function isYouTubeHit(x: unknown): x is YoutubeSearchHit {
  return !!x && typeof x === "object" && "videoId" in (x as YoutubeSearchHit) && "channelTitle" in (x as YoutubeSearchHit);
}

function TrackCarouselItems({ items }: { items: unknown[] }) {
  const setQueue = usePlayerStore((s) => s.setQueue);
  // unwrap cases where item is { track: Track } (continue-listening / recently-played)
  const tracks: Track[] = items
    .map((it) => {
      if (isTrack(it)) return it;
      if (it && typeof it === "object" && "track" in (it as { track: Track })) {
        const t = (it as { track: Track }).track;
        if (isTrack(t)) return t;
      }
      return null;
    })
    .filter(Boolean) as Track[];

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
  const [youtubeImporting, setYoutubeImporting] = useState<string | null>(null);

  const importAndPlay = async (videoId: string) => {
    if (youtubeImporting) return;
    setYoutubeImporting(videoId);
    try {
      const res = await fetch("/api/youtube/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://youtu.be/${videoId}` }),
      });
      if (!res.ok) throw new Error("intake failed");
      const dataJson = (await res.json()) as { track: Track };
      if (dataJson?.track) usePlayerStore.getState().playTrack(dataJson.track);
    } catch {
      // ignore
    } finally {
      setYoutubeImporting(null);
    }
  };

  return (
    <div className="space-y-8">
      {sections.map((sec) => {
        const key = sec.key;
        const items = sec.items;
        if (!items?.length) return null;

        if (key === "youtube-trending" && items.some(isYouTubeHit)) {
          return (
            <section key={key}>
              <SectionHeader title={sec.title} subtitle={sec.subtitle} />
              <Carousel>
                {(items as YoutubeSearchHit[]).map((hit) => (
                  <div key={hit.videoId} className="w-[240px] shrink-0 snap-start">
                    <button
                      onClick={() => importAndPlay(hit.videoId)}
                      disabled={youtubeImporting === hit.videoId}
                      className="group w-full rounded-xl text-left focus:outline-none"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-card">
                        {hit.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={hit.thumbnailUrl}
                            alt={hit.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full" style={{ background: artworkFallback(hit.title) }} />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                          {youtubeImporting === hit.videoId ? (
                            <Loader2 size={22} className="animate-spin text-white" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white">
                              <Play className="h-4 w-4 fill-current ml-0.5" />
                            </span>
                          )}
                        </div>
                        {hit.durationSec ? (
                          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            {formatDuration(hit.durationSec)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">{hit.title}</p>
                      <p className="truncate text-xs text-muted">{hit.channelTitle}</p>
                      <p className="text-[11px] text-muted/80">
                        {hit.viewCount != null ? `${formatCount(hit.viewCount)} views` : ""}
                        {hit.viewCount != null && hit.publishedAt ? " · " : ""}
                        {hit.publishedAt ? timeAgo(hit.publishedAt) : ""}
                      </p>
                    </button>
                  </div>
                ))}
              </Carousel>
            </section>
          );
        }

        if (key === "genres" && items.some(isGenre)) {
          return (
            <section key={key}>
              <SectionHeader title={sec.title} subtitle={sec.subtitle} />
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {(items as Genre[]).map((g) => (
                  <Link
                    key={g.id}
                    href={`/app/search?q=${encodeURIComponent(g.name)}`}
                    className="shrink-0 flex h-20 w-36 items-center justify-center rounded-2xl border border-border px-3 text-center text-sm font-semibold transition-transform hover:scale-105"
                    style={{ background: g.thumbnailColor ?? artworkFallback(g.name) }}
                  >
                    <span className="drop-shadow text-white">{g.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        }

        // default: track-like sections
        return (
          <section key={key}>
            <SectionHeader title={sec.title} subtitle={sec.subtitle} />
            <TrackCarouselItems items={items} />
          </section>
        );
      })}
    </div>
  );
}
