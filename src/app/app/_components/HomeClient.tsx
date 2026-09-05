"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { TrackCard, ArtistCard } from "@/components/cards";
import { usePlayerStore } from "@/stores/player";
import { artworkFallback, formatDuration, formatCount, timeAgo } from "@/lib/utils";
import type { Track, Artist, Album, Genre, Mix, YoutubeSearchHit } from "@/types/music";

type Hero = {
  title: string;
  description: string;
  track: Track | null;
  cta: string;
};

type Section = {
  key: string;
  title: string;
  subtitle?: string;
  items: unknown[];
};

function HeroCard({ hero }: { hero: Hero }) {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const t = hero.track;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border glass p-6 md:p-8">
      {/* amber accent glow */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle at center, #FFB454 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle at center, #FFB454 0%, transparent 70%)" }}
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex-1 space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold tracking-wide text-primary">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Featured
          </span>
          <h1 className="font-display text-2xl font-bold leading-tight md:text-3xl text-balance">
            {hero.title}
          </h1>
          <p className="text-sm text-muted max-w-prose">{hero.description}</p>
          {t && (
            <button
              onClick={() => (t.sources?.length ? playTrack(t) : setQueue([t], 0))}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow"
            >
              <Play className="h-4 w-4 fill-current" />
              {hero.cta}
            </button>
          )}
        </div>
        {t && (
          <div className="shrink-0 w-full md:w-[280px]">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-card shadow-card">
              {t.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.thumbnailUrl} alt={t.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full" style={{ background: artworkFallback(t.title) }} />
              )}
              <button
                onClick={() => playTrack(t)}
                className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
                aria-label={`Play ${t.title}`}
              >
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </button>
            </div>
            <p className="mt-3 truncate text-sm font-semibold">{t.title}</p>
            <p className="truncate text-xs text-muted">{t.artist}</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
function isArtist(x: unknown): x is Artist {
  return !!x && typeof x === "object" && "name" in (x as Artist) && "monthlyListeners" in (x as Artist);
}
function isAlbum(x: unknown): x is Album {
  return !!x && typeof x === "object" && "coverUrl" in (x as Album) && "artist" in (x as Album);
}
function isGenre(x: unknown): x is Genre {
  return !!x && typeof x === "object" && "slug" in (x as Genre);
}
function isMix(x: unknown): x is Mix {
  return !!x && typeof x === "object" && "tracks" in (x as Mix) && "subtitle" in (x as Mix);
}
function isYouTubeHit(x: unknown): x is YoutubeSearchHit {
  return !!x && typeof x === "object" && "videoId" in (x as YoutubeSearchHit) && "channelTitle" in (x as YoutubeSearchHit);
}

function TrackCarouselItems({ items }: { items: unknown[] }) {
  const playTrack = usePlayerStore((s) => s.playTrack);
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

export default function HomeClient({ hero, sections }: { hero: Hero; sections: Section[] }) {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const setQueue = usePlayerStore((s) => s.setQueue);
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
      <HeroCard hero={hero} />

      {sections.map((sec) => {
        const key = sec.key;
        const items = sec.items;
        if (!items?.length) return null;

        // mixes: items are Mix[]
        if (key === "mixes" && items.some(isMix)) {
          return (
            <section key={key}>
              <SectionHeader title={sec.title} subtitle={sec.subtitle} />
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {(items as Mix[]).map((mix, idx) => (
                  <div
                    key={mix.title + idx}
                    className="shrink-0 w-[300px] rounded-2xl border border-border bg-surface p-4 hover:bg-surface-elevated transition-colors"
                  >
                    <div
                      className="h-2 w-10 rounded-full mb-3"
                      style={{ background: mix.color ?? "#FFB454" }}
                    />
                    <h3 className="font-semibold text-sm">{mix.title}</h3>
                    <p className="text-xs text-muted truncate">{mix.subtitle}</p>
                    <div className="mt-3 flex -space-x-2">
                      {mix.tracks.slice(0, 4).map((t, i) =>
                        t.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={t.id ?? i}
                            src={t.thumbnailUrl}
                            alt=""
                            className="h-9 w-9 rounded-full border-2 border-surface object-cover"
                          />
                        ) : (
                          <div
                            key={t.id ?? i}
                            className="h-9 w-9 rounded-full border-2 border-surface"
                            style={{ background: artworkFallback(t.title) }}
                          />
                        )
                      )}
                    </div>
                    <button
                      onClick={() => mix.tracks.length && setQueue(mix.tracks, 0)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Play mix
                    </button>
                  </div>
                ))}
              </div>
            </section>
          );
        }

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

        if (key === "artists" && items.some(isArtist)) {
          return (
            <section key={key}>
              <SectionHeader title={sec.title} subtitle={sec.subtitle} />
              <Carousel>
                {(items as Artist[]).map((a) => (
                  <div key={a.id} className="w-[160px] shrink-0 snap-start">
                    <ArtistCard artist={a} />
                  </div>
                ))}
              </Carousel>
            </section>
          );
        }

        if (key === "albums" && items.some(isAlbum)) {
          return (
            <section key={key}>
              <SectionHeader title={sec.title} subtitle={sec.subtitle} />
              <Carousel>
                {(items as Album[]).map((al) => (
                  <div
                    key={al.id}
                    className="w-[168px] shrink-0 snap-start rounded-2xl bg-surface p-3 hover:bg-surface-elevated transition-colors"
                  >
                    <div className="aspect-square overflow-hidden rounded-xl bg-card">
                      {al.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={al.coverUrl} alt={al.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full" style={{ background: artworkFallback(al.title) }} />
                      )}
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">{al.title}</p>
                    <p className="truncate text-xs text-muted">{al.artist}</p>
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
                  <div
                    key={g.id}
                    className="shrink-0 flex h-20 w-36 items-center justify-center rounded-2xl border border-border px-3 text-center text-sm font-semibold"
                    style={{ background: g.thumbnailColor ?? artworkFallback(g.name) }}
                  >
                    <span className="drop-shadow text-white">{g.name}</span>
                  </div>
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
