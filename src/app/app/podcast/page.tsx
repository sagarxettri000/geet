"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, Mic2, Play, RefreshCw, Search, X } from "lucide-react";
import { usePlayerStore } from "@/stores/player";
import { artworkFallback, formatDuration, timeAgo } from "@/lib/utils";
import type { Track, YoutubeSearchHit } from "@/types/music";

const STORAGE_KEY = "geet:podcast-query";
const DEFAULT_QUERY = "Raj Samani podcast";
const PAGE = 20;

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("podcast load failed");
    return r.json();
  });

function defaultQuery(): string {
  if (typeof window === "undefined") return DEFAULT_QUERY;
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_QUERY;
  } catch {
    return DEFAULT_QUERY;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function EpisodeCard({
  hit,
  importing,
  onPlay,
}: {
  hit: YoutubeSearchHit;
  importing: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onPlay}
      disabled={importing}
      className="group rounded-2xl border border-border bg-surface p-2 text-left transition-colors hover:border-primary/50"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-card">
        {hit.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hit.thumbnailUrl}
            alt={hit.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full" style={{ background: artworkFallback(hit.title) }} />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {importing ? (
            <Loader2 size={22} className="animate-spin text-white" />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-full bg-primary shadow-lg">
              <Play size={18} className="ml-0.5 fill-white text-white" />
            </span>
          )}
        </div>
        {hit.durationSec != null && (
          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {formatDuration(hit.durationSec)}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug">{hit.title}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted">
        {hit.channelTitle}
        {hit.publishedAt ? ` · ${timeAgo(hit.publishedAt)}` : ""}
      </p>
    </button>
  );
}

type Mode = "trending" | "search";

export default function PodcastPage() {
  const [input, setInput] = useState(defaultQuery());
  const [mode, setMode] = useState<Mode>("trending");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [seen, setSeen] = useState(PAGE);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  const cacheKey =
    mode === "search" && activeQuery
      ? `/api/podcasts?q=${encodeURIComponent(activeQuery)}`
      : "/api/podcasts?mode=trending";

  const { data, isLoading, error, mutate } = useSWR<{
    mode?: string;
    region?: string;
    query?: string;
    reason?: string;
    hits: YoutubeSearchHit[];
  }>(cacheKey, fetcher, { keepPreviousData: true, revalidateOnFocus: false });

  const hits = data?.hits ?? [];
  const shown = hits.slice(0, seen);

  const submit = (raw?: string) => {
    const q = (raw ?? input).trim();
    if (!q) {
      setMode("trending");
      return;
    }
    setMode("search");
    setActiveQuery(q);
    setSeen(PAGE);
    try {
      localStorage.setItem(STORAGE_KEY, q);
    } catch {}
  };

  const refresh = () => {
    if (!hits.length) return;
    setRefreshing(true);
    void mutate(
      async () => {
        const next = await fetcher(`/api/podcasts?mode=trending&_=${Date.now()}`);
        return next;
      },
      {
        optimisticData: (current) =>
          current
            ? { ...current, hits: shuffle(current.hits ?? []) }
            : { hits: [], mode: "trending" },
      }
    ).finally(() => setRefreshing(false));
  };

  const importAndPlay = async (videoId: string) => {
    if (importing) return;
    setImporting(videoId);
    try {
      const res = await fetch("/api/youtube/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://youtu.be/${videoId}` }),
      });
      if (!res.ok) throw new Error("intake failed");
      const json = (await res.json()) as { track: Track };
      if (json?.track) usePlayerStore.getState().playTrack(json.track);
    } catch {
      // ignore
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Mic2 className="h-5 w-5 text-primary" /> Podcasts
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Trending episodes play as audio in your player — tap a card to start.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing || isLoading || !hits.length}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-surface-elevated disabled:opacity-50"
          aria-label="Refresh podcasts"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* mode toggle */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setMode("trending")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            mode === "trending"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-surface text-muted hover:bg-surface-elevated hover:text-foreground"
          }`}
        >
          Trending
        </button>
        <button
          onClick={() => submit()}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            mode === "search"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-surface text-muted hover:bg-surface-elevated hover:text-foreground"
          }`}
        >
          Search
        </button>
      </div>

      {/* show search */}
      {mode === "search" && (
        <div className="flex max-w-xl flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <label htmlFor="podcast-search" className="sr-only">Search a podcast or host</label>
            <input
              id="podcast-search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Search a podcast or host…"
              className="h-11 w-full rounded-full border border-border bg-surface py-2 pl-10 pr-10 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {input && (
              <button
                onClick={() => setInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-surface"
                aria-label="Clear"
              >
                <X className="h-4 w-4 text-muted" />
              </button>
            )}
          </div>
          <button
            onClick={() => submit()}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            Show
          </button>
        </div>
      )}

      {isLoading && mode === "trending" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface p-2">
              <div className="aspect-video rounded-xl skeleton" />
              <div className="mt-2 h-3 w-4/5 rounded skeleton" />
              <div className="mt-1.5 h-3 w-2/5 rounded skeleton" />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-danger">Couldn&apos;t load podcasts. Try again in a moment.</p>}

      {!isLoading && !error && mode === "trending" && hits.length > 0 && (
        <>
          <div>
            <h2 className="text-sm font-semibold">
              Trending podcasts{" "}
              <span className="font-normal text-muted">
                · {data?.region ?? ""} · {hits.length} episodes
              </span>
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {hits.map((hit) => (
              <EpisodeCard
                key={hit.videoId}
                hit={hit}
                importing={importing === hit.videoId}
                onPlay={() => importAndPlay(hit.videoId)}
              />
            ))}
          </div>
        </>
      )}

      {!isLoading && !error && mode === "search" && hits.length > 0 && (
        <>
          <div>
            <h2 className="text-sm font-semibold">
              {activeQuery} <span className="font-normal text-muted">· {hits.length} episodes</span>
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((hit) => (
              <EpisodeCard
                key={hit.videoId}
                hit={hit}
                importing={importing === hit.videoId}
                onPlay={() => importAndPlay(hit.videoId)}
              />
            ))}
          </div>
          {seen < hits.length && (
            <button
              onClick={() => setSeen((s) => s + PAGE)}
              className="mx-auto block rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium hover:bg-surface-elevated transition-colors"
            >
              Show more ({Math.min(PAGE, hits.length - seen)} more)
            </button>
          )}
        </>
      )}

      {!isLoading && !error && hits.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface/50 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface border border-border">
            <Mic2 className="h-7 w-7 text-muted" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            {mode === "trending" ? "No trending episodes" : "Nothing found"}
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted">
            {data?.reason === "no-key"
              ? "Trending podcasts need a YouTube API key. Configure YOUTUBE_API_KEY to load them."
              : mode === "trending"
                ? "No trending episodes came back for your region right now."
                : `No episodes came back for "${activeQuery}". Try another show or host.`}
          </p>
        </div>
      )}
    </div>
  );
}