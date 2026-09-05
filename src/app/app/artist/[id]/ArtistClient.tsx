"use client";
import { useState } from "react";
import { Play, Heart, BadgeCheck, Shuffle } from "lucide-react";
import { usePlayerStore } from "@/stores/player";
import type { Track } from "@/types/music";
import { formatDuration, artworkFallback } from "@/lib/utils";

export function ArtistActions({
  artistId,
  initialFollowing,
  tracks,
}: {
  artistId: string;
  initialFollowing: boolean;
  tracks: Track[];
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const setQueue = usePlayerStore((s) => s.setQueue);

  const toggleFollow = async () => {
    if (loading) return;
    setLoading(true);
    const method = following ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/artists/${artistId}/follow`, { method });
      if (res.ok) setFollowing(!following);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => tracks.length && setQueue(tracks, 0)}
        disabled={!tracks.length}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow"
      >
        <Play className="h-4 w-4 fill-current" /> Play all
      </button>
      <button
        onClick={toggleFollow}
        disabled={loading}
        className={`rounded-full px-5 py-2.5 text-sm font-semibold border transition-colors disabled:opacity-50 ${following ? "bg-surface border-border hover:bg-surface-elevated" : "bg-primary-soft border-primary/20 text-primary hover:bg-primary/10"}`}
      >
        {following ? "Following" : "Follow"}
      </button>
      <button
        onClick={() => tracks.length && setQueue([...tracks].sort(() => Math.random() - 0.5), 0)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2.5 text-sm hover:bg-surface-elevated"
      >
        <Shuffle className="h-4 w-4" /> Shuffle
      </button>
    </div>
  );
}

export function TrackList({
  tracks,
  likedSet,
  playlists,
}: {
  tracks: Track[];
  likedSet: Set<string>;
  playlists?: { id: string; name: string }[];
}) {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const [likes, setLikes] = useState(likedSet);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleLike = async (id?: string) => {
    if (!id) return;
    const was = likes.has(id);
    setLikes((prev) => {
      const n = new Set(prev);
      if (was) n.delete(id);
      else n.add(id);
      return n;
    });
    await fetch(`/api/tracks/${id}/like`, { method: "POST" });
  };

  const addToPlaylist = async (playlistId: string, trackId: string) => {
    await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
    setOpenMenu(null);
  };

  if (!tracks.length) return <p className="py-8 text-center text-sm text-muted">No tracks yet.</p>;

  return (
    <div className="divide-y divide-border/50 rounded-2xl border border-border bg-surface/50 overflow-hidden">
      {tracks.map((t, i) => (
        <div key={t.id ?? i} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-elevated/60 transition-colors group">
          <span className="w-6 text-center text-xs tabular-nums text-muted">{i + 1}</span>
          {t.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.thumbnailUrl} alt="" className="h-11 w-11 rounded-md object-cover shrink-0" />
          ) : (
            <div className="h-11 w-11 rounded-md shrink-0" style={{ background: artworkFallback(t.title) }} />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{t.title}</p>
            <p className="truncate text-xs text-muted">{t.artist} · {formatDuration(t.durationSec)}</p>
          </div>
          <button onClick={() => toggleLike(t.id)} className={`p-2 rounded-full hover:bg-surface ${t.id && likes.has(t.id) ? "text-primary" : "text-muted"}`}>
            <Heart className={`h-4 w-4 ${t.id && likes.has(t.id) ? "fill-current" : ""}`} />
          </button>
          {playlists?.length ? (
            <div className="relative">
              <button onClick={() => setOpenMenu(openMenu === t.id ? null : t.id ?? null)} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs hover:bg-card">Add</button>
              {openMenu === t.id && (
                <div className="absolute right-0 top-8 z-10 w-44 rounded-xl border border-border bg-background-elevated p-1 shadow-float max-h-48 overflow-y-auto">
                  {playlists.map((pl) => (
                    <button key={pl.id} onClick={() => t.id && addToPlaylist(pl.id, t.id)} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface truncate">
                      {pl.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          <button onClick={() => (t.id ? setQueue(tracks, i) : playTrack(t))} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
