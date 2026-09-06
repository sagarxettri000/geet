"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { Clock, Heart, ListMusic, Mic2, Disc3, ArrowUpDown, Play } from "lucide-react";
import { usePlayerStore } from "@/stores/player";
import { artworkFallback, formatDuration } from "@/lib/utils";
import type { Track } from "@/types/music";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(url);
  return r.json();
});

type Tab = "liked" | "playlists" | "artists" | "recent" | "albums";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "liked", label: "Liked Songs", icon: Heart },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "recent", label: "Recently Played", icon: Clock },
  { id: "artists", label: "Artists", icon: Mic2 },
  { id: "albums", label: "Albums", icon: Disc3 },
];

type Sort = "recent" | "name" | "artist";

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("liked");
  const [sort, setSort] = useState<Sort>("recent");
  const [q, setQ] = useState("");

  const { data: historyData } = useSWR(tab === "recent" || tab === "liked" || tab === "artists" || tab === "albums" ? "/api/history" : null, fetcher);
  const { data: playlistsData } = useSWR(tab === "playlists" ? "/api/playlists" : null, fetcher);
  // liked tracks: derive from home feed (has liked section) as fallback – lightweight
  const { data: homeData } = useSWR(tab === "liked" ? "/api/home" : null, fetcher);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const setQueue = usePlayerStore((s) => s.setQueue);

  const likedTracks: Track[] = useMemo(() => {
    if (!homeData) return [];
    const sec = (homeData.sections as { key: string; items: Track[] }[])?.find((s) => s.key === "liked");
    if (sec?.items?.length) return sec.items;
    // fallback: try historyData liked? use recentlyPlayed tracks as demo
    return [];
  }, [homeData]);

  const recentTracks: { track: Track; playedAt: string }[] = historyData?.recentlyPlayed ?? historyData?.listeningHistory?.map((h: { track: Track; playedAt: string }) => ({ track: h.track, playedAt: h.playedAt })) ?? [];

  // derived lists for sorting/filtering
  const filteredLiked = useMemo(() => {
    let arr = [...likedTracks];
    if (q) arr = arr.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(q.toLowerCase()));
    if (sort === "name") arr.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "artist") arr.sort((a, b) => a.artist.localeCompare(b.artist));
    return arr;
  }, [likedTracks, q, sort]);

  const filteredRecent = useMemo(() => {
    let arr = [...recentTracks];
    if (q) arr = arr.filter((r) => `${r.track.title} ${r.track.artist}`.toLowerCase().includes(q.toLowerCase()));
    if (sort === "name") arr.sort((a, b) => a.track.title.localeCompare(b.track.title));
    else if (sort === "artist") arr.sort((a, b) => a.track.artist.localeCompare(b.track.artist));
    // recent default already sorted
    return arr;
  }, [recentTracks, q, sort]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Your Library</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <label htmlFor="library-filter" className="sr-only">Filter your library</label>
            <input
              id="library-filter"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter"
              className="h-8 w-32 rounded-full border border-border bg-surface px-3 text-sm placeholder:text-muted focus:w-48 transition-all focus:outline-none focus:ring-2 focus:ring-primary sm:w-40"
            />
          </div>
          <label className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="bg-transparent text-xs outline-none"
            >
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="artist">Artist</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${tab === id ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-surface-elevated border border-border"}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface/50 p-3 sm:p-4">
        {tab === "liked" && (
          filteredLiked.length ? (
            <div className="divide-y divide-border/50">
              {filteredLiked.map((t, i) => (
                <div key={(t.id ?? t.title) + i} className="flex items-center gap-3 py-2">
                  {t.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.thumbnailUrl} alt="" className="h-11 w-11 rounded-md object-cover shrink-0" />
                  ) : <div className="h-11 w-11 rounded-md shrink-0" style={{ background: artworkFallback(t.title) }} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="truncate text-xs text-muted">{t.artist} · {formatDuration(t.durationSec)}</p>
                  </div>
                  <button onClick={() => setQueue(filteredLiked, i)} aria-label={`Play ${t.title}`} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted">No liked songs yet. Heart tracks to see them here.</p>
          )
        )}

        {tab === "playlists" && (
          playlistsData?.playlists?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {playlistsData.playlists
                .filter((p: { name: string }) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
                .sort((a: { name: string }, b: { name: string }) => sort === "name" ? a.name.localeCompare(b.name) : 0)
                .map((pl: { id: string; name: string; description: string | null; trackCount: number; coverUrl: string | null }) => (
                <div key={pl.id} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-card overflow-hidden">
                    {pl.coverUrl ? <img src={pl.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: artworkFallback(pl.name) }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{pl.name}</p>
                    <p className="truncate text-xs text-muted">{pl.trackCount} tracks</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted">No playlists yet. Create one from the Playlists page.</p>
          )
        )}

        {tab === "recent" && (
          filteredRecent.length ? (
            <div className="divide-y divide-border/50">
              {filteredRecent.map((r, i) => (
                <div key={r.track.id ?? i + r.playedAt} className="flex items-center gap-3 py-2">
                  {r.track.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.track.thumbnailUrl} alt="" className="h-11 w-11 rounded-md object-cover shrink-0" />
                  ) : <div className="h-11 w-11 rounded-md shrink-0" style={{ background: artworkFallback(r.track.title) }} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.track.title}</p>
                    <p className="truncate text-xs text-muted">{r.track.artist}</p>
                  </div>
                  <button onClick={() => playTrack(r.track)} aria-label={`Play ${r.track.title}`} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-surface border border-border">
                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted">No recent plays.</p>
          )
        )}

        {(tab === "artists" || tab === "albums") && (
          <p className="py-12 text-center text-sm text-muted">
            {tab === "artists" ? "Artists you follow will appear here." : "Saved albums will appear here."}
          </p>
        )}
      </div>
    </div>
  );
}
