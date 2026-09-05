"use client";
import { useState } from "react";
import { Play, Heart, MoreHorizontal, Plus } from "lucide-react";
import { usePlayerStore } from "@/stores/player";
import type { Track } from "@/types/music";
import { formatDuration, artworkFallback } from "@/lib/utils";

export function AlbumTrackList({
  tracks,
  likedSet,
  playlists,
}: {
  tracks: Track[];
  likedSet: Set<string>;
  playlists: { id: string; name: string }[];
}) {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const [likes, setLikes] = useState(likedSet);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleLike = async (id?: string) => {
    if (!id) return;
    const had = likes.has(id);
    setLikes((prev) => {
      const n = new Set(prev);
      if (had) n.delete(id);
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
    setOpenId(null);
  };

  return (
    <div className="divide-y divide-border/50 rounded-2xl border border-border bg-surface/50 overflow-hidden">
      {tracks.map((t, i) => (
        <div key={t.id ?? i} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-elevated/60 transition-colors group">
          <span className="w-6 text-center text-xs text-muted">{i + 1}</span>
          <div className="h-10 w-10 shrink-0 rounded-md bg-card overflow-hidden">
            {t.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" style={{ background: artworkFallback(t.title) }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{t.title}</p>
            <p className="truncate text-xs text-muted">{t.artist}</p>
          </div>
          <span className="hidden text-xs text-muted sm:block">{formatDuration(t.durationSec)}</span>
          <button onClick={() => toggleLike(t.id)} className={`p-2 rounded-full hover:bg-surface ${t.id && likes.has(t.id) ? "text-primary" : "text-muted"}`}>
            <Heart className={`h-4 w-4 ${t.id && likes.has(t.id) ? "fill-current" : ""}`} />
          </button>
          <div className="relative">
            <button onClick={() => setOpenId(openId === t.id ? null : t.id ?? null)} className="p-2 rounded-full hover:bg-surface text-muted">
              <Plus className="h-4 w-4" />
            </button>
            {openId === t.id && playlists.length > 0 && (
              <div className="absolute right-0 top-8 z-10 w-44 rounded-xl border border-border bg-background-elevated p-1 shadow-float max-h-48 overflow-y-auto">
                {playlists.map((pl) => (
                  <button key={pl.id} onClick={() => t.id && addToPlaylist(pl.id, t.id)} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface truncate">
                    {pl.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setQueue(tracks, i)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
          </button>
        </div>
      ))}
      {!tracks.length && <p className="py-10 text-center text-sm text-muted">No tracks in this album.</p>}
    </div>
  );
}

export function PlayAllBtn({ tracks }: { tracks: Track[] }) {
  const setQueue = usePlayerStore((s) => s.setQueue);
  return (
    <button
      onClick={() => tracks.length && setQueue(tracks, 0)}
      disabled={!tracks.length}
      className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 shadow"
    >
      <Play className="h-4 w-4 fill-current" /> Play
    </button>
  );
}
