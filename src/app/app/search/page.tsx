"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Search, Play, Clock, X, Loader2 } from "lucide-react";
import { usePlayerStore } from "@/stores/player";
import { artworkFallback, formatDuration, formatCount, timeAgo } from "@/lib/utils";
import type { SearchResults, Track, YoutubeSearchHit } from "@/types/music";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("search failed");
  return r.json();
});

const RECENT_KEY = "geet:recent-searches";

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-2">
      <div className="h-12 w-12 shrink-0 rounded-md skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/5 rounded skeleton" />
        <div className="h-3 w-2/5 rounded skeleton" />
      </div>
    </div>
  );
}

function SearchPage() {
  // keep the input in sync with ?q= from the top bar (and reflect every
  // navigation, not just the first mount)
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>(() => searchParams.get("q") ?? "");
  const debounced = useDebounced(query.trim(), 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [importingId, setImportingId] = useState<string | null>(null);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const setQueue = usePlayerStore((s) => s.setQueue);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, []);

  const persistRecent = (q: string) => {
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  };

  const { data, isLoading, error } = useSWR<SearchResults>(
    debounced ? `/api/search?q=${encodeURIComponent(debounced)}` : null,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  const { data: suggestions } = useSWR<{
    tracks: Track[];
    artists: { id: string; name: string }[];
    genres: { id: string; name: string }[];
  }>(!debounced ? "/api/search/suggestions" : null, fetcher, {
    revalidateOnFocus: false,
  });

  const { data: trending } = useSWR<{ region: string; hits: YoutubeSearchHit[] }>(
    !debounced ? "/api/youtube/trending" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const importAndPlay = async (videoId: string) => {
    if (importingId) return;
    setImportingId(videoId);
    try {
      const res = await fetch("/api/youtube/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://youtu.be/${videoId}` }),
      });
      if (!res.ok) throw new Error("intake failed");
      const dataJson = (await res.json()) as { track: Track };
      if (dataJson?.track) {
        usePlayerStore.getState().playTrack(dataJson.track);
        persistRecent(debounced);
      }
    } catch {
      // ignore
    } finally {
      setImportingId(null);
    }
  };

  const flatTracks: Track[] = useMemo(() => data?.tracks ?? [], [data]);

  // keyboard nav over tracks
  useEffect(() => {
    if (!flatTracks.length) { setFocusIdx(-1); return; }
    if (focusIdx >= flatTracks.length) setFocusIdx(flatTracks.length - 1);
  }, [flatTracks, focusIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!flatTracks.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(flatTracks.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && focusIdx >= 0) {
      e.preventDefault();
      const t = flatTracks[focusIdx];
      if (t) { setQueue(flatTracks, focusIdx); persistRecent(debounced); }
    }
  };

  const isEmpty = !debounced;

  return (
    <div className="space-y-6">
      <div className="relative max-w-[640px]">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search songs, artists, albums, playlists"
          className="h-11 w-full rounded-full border border-border bg-surface py-2 pl-10 pr-10 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-surface"
            aria-label="Clear"
          >
            <X className="h-4 w-4 text-muted" />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2 max-w-[640px]">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {error && <p className="text-sm text-danger">Failed to search. Try again.</p>}

      {isEmpty ? (
        <div className="space-y-6 max-w-[640px]">
          {recent.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-muted" /> Recent searches</h3>
                <button
                  onClick={() => { setRecent([]); try{localStorage.removeItem(RECENT_KEY);}catch{} }}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuery(q)}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-elevated"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {trending && trending.hits.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center justify-between">
                <span>Trending on YouTube <span className="text-muted font-normal">· live · {trending.region}</span></span>
              </h3>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
                {trending.hits.map((hit) => (
                  <div key={hit.videoId} className="w-[220px] shrink-0">
                    <button
                      onClick={() => importAndPlay(hit.videoId)}
                      disabled={importingId === hit.videoId}
                      className="group w-full text-left"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-lg bg-card">
                        {hit.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={hit.thumbnailUrl} alt={hit.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="h-full w-full" style={{ background: artworkFallback(hit.title) }} />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                          {importingId === hit.videoId ? <Loader2 size={20} className="animate-spin text-white" /> : <Play size={16} className="text-white fill-white ml-0.5" />}
                        </div>
                        {hit.durationSec ? (
                          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">{formatDuration(hit.durationSec)}</span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug">{hit.title}</p>
                      <p className="truncate text-[11px] text-muted">{hit.channelTitle} · {hit.viewCount != null ? formatCount(hit.viewCount) : ""}{hit.viewCount != null ? " views" : ""}</p>
                      {hit.publishedAt ? <p className="text-[11px] text-muted/70">{timeAgo(hit.publishedAt)}</p> : null}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold mb-2">Genres</h3>
            <div className="flex flex-wrap gap-2">
              {(suggestions?.genres ?? []).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setQuery(g.name)}
                  className="rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Popular artists</h3>
            <div className="flex flex-wrap gap-2">
              {(suggestions?.artists ?? []).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setQuery(a.name)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-elevated"
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Popular songs</h3>
            <div className="flex flex-wrap gap-2">
              {(suggestions?.tracks ?? []).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setQuery(t.title)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-elevated"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted">Tip: press ↑ ↓ then Enter to play from results.</p>
        </div>
      ) : data ? (
        <div ref={listRef} className="space-y-8">
          {data.youtube && data.youtube.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">From YouTube <span className="text-muted font-normal">· search the whole of YouTube</span></h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.youtube.map((hit) => (
                  <button
                    key={hit.videoId}
                    onClick={() => importAndPlay(hit.videoId)}
                    disabled={importingId === hit.videoId}
                    className="group rounded-xl border border-border bg-surface p-2 text-left hover:border-primary/50"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-card">
                      {hit.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={hit.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="h-full w-full" style={{ background: artworkFallback(hit.title) }} />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                        {importingId === hit.videoId ? <Loader2 size={20} className="animate-spin text-white" /> : <Play size={16} className="text-white fill-white ml-0.5" />}
                      </div>
                      {hit.durationSec ? (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">{formatDuration(hit.durationSec)}</span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold leading-snug">{hit.title}</p>
                    <p className="truncate text-[11px] text-muted">{hit.channelTitle}</p>
                    <p className="text-[11px] text-muted/70">
                      {hit.viewCount != null ? `${formatCount(hit.viewCount)} views` : ""}
                      {hit.viewCount != null && hit.publishedAt ? " · " : ""}
                      {hit.publishedAt ? timeAgo(hit.publishedAt) : ""}
                    </p>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted/70">Tapping a result imports the video into GEET and plays it instantly.</p>
            </section>
          )}
          {(["tracks", "artists", "albums", "playlists"] as const).map((group) => {
            const items = (data as unknown as Record<string, unknown[]>)[group] as unknown[];
            if (!items?.length) return null;
            const title = group[0].toUpperCase() + group.slice(1);
            return (
              <section key={group}>
                <h3 className="text-sm font-semibold mb-2">{title} <span className="text-muted font-normal">· {items.length}</span></h3>
                {group === "tracks" ? (
                  <div className="divide-y divide-border/50 rounded-2xl border border-border bg-surface overflow-hidden">
                    {(items as Track[]).map((t, idx) => {
                      const active = idx === focusIdx;
                      return (
                        <button
                          key={(t.id ?? t.title) + idx}
                          onClick={() => { setQueue(flatTracks, idx); persistRecent(debounced); }}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-elevated transition-colors ${active ? "bg-primary-soft ring-1 ring-primary/30" : ""}`}
                        >
                          {t.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.thumbnailUrl} alt="" className="h-11 w-11 rounded-md object-cover shrink-0" />
                          ) : (
                            <div className="h-11 w-11 shrink-0 rounded-md" style={{ background: artworkFallback(t.title) }} />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{t.title}</span>
                            <span className="block truncate text-xs text-muted">{t.artist} · {formatDuration(t.durationSec)}</span>
                          </span>
                          <span className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : group === "artists" ? (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    {items.map((a: unknown) => {
                      const art = a as { id: string; name: string; imageUrl: string | null; verified?: boolean };
                      return (
                        <div key={art.id} className="shrink-0 w-28 rounded-2xl bg-surface p-3 text-center">
                          <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-card">
                            {art.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={art.imageUrl} alt={art.name} className="h-full w-full object-cover" />
                            ) : <div className="h-full w-full" style={{ background: artworkFallback(art.name) }} /> }
                          </div>
                          <p className="mt-2 truncate text-xs font-semibold">{art.name}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : group === "albums" ? (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    {(items as { id:string; title:string; artist:string; coverUrl:string|null }[]).map((al) => (
                      <div key={al.id} className="shrink-0 w-36 rounded-xl bg-surface p-2">
                        <div className="aspect-square rounded-lg bg-card overflow-hidden">
                          {al.coverUrl ? <img src={al.coverUrl} alt={al.title} className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: artworkFallback(al.title) }} />}
                        </div>
                        <p className="mt-1.5 truncate text-xs font-semibold">{al.title}</p>
                        <p className="truncate text-[11px] text-muted">{al.artist}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(items as { id:string; name:string; description:string|null; trackCount:number }[]).map((pl) => (
                      <div key={pl.id} className="rounded-xl border border-border bg-surface px-3 py-3">
                        <p className="truncate text-sm font-semibold">{pl.name}</p>
                        <p className="truncate text-xs text-muted">{pl.trackCount} tracks{pl.description ? ` · ${pl.description.slice(0,40)}` : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          {!data.tracks.length && !data.artists.length && !data.albums.length && !data.playlists.length && !data.genres.length && !data.youtube?.length && (
            <div className="py-10 text-center">
              <p className="text-sm text-muted">Nothing found for “{debounced}” on YouTube or in your catalog.</p>
              <p className="mt-1 text-[11px] text-muted/70">Try a different spelling or artist name.</p>
            </div>
          )}
          {data.genres.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Genres <span className="text-muted font-normal">· {data.genres.length} · tap to discover the songs</span></h3>
              <div className="flex flex-wrap gap-2">
                {data.genres.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setQuery(g.name)}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-primary-soft hover:text-primary transition-colors"
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPageRoute() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  return (
    <Suspense fallback={<div className="py-10 text-sm text-muted">Loading search…</div>}>
      <SearchPage key={q} />
    </Suspense>
  );
}
