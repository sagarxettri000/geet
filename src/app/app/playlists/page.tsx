"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, MoreVertical, Trash2, Music2, Loader2 } from "lucide-react";
import { artworkFallback } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PlaylistsPage() {
  const { data, mutate, isLoading } = useSWR<{ playlists: { id: string; name: string; description: string | null; coverUrl: string | null; trackCount: number }[] }>(
    "/api/playlists",
    fetcher
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const create = async () => {
    const n = name.trim();
    if (!n) { setErr("Name required"); return; }
    setCreating(true); setErr(null);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, description: desc.trim() || null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Failed to create");
      setName(""); setDesc(""); setOpen(false);
      mutate();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setCreating(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this playlist?")) return;
    setMenuId(null);
    await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    mutate();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Playlists</h1>
        <button
          onClick={() => setOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> New playlist
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-border bg-surface skeleton" />
          ))}
        </div>
      ) : !data?.playlists?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-16 text-center">
          <Music2 className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-2 text-sm font-medium">No playlists yet</p>
          <p className="text-xs text-muted">Create your first playlist to organize tracks.</p>
          <button onClick={() => setOpen(true)} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Create playlist</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.playlists.map((pl) => (
            <div key={pl.id} className="group relative flex gap-3 rounded-2xl border border-border bg-surface p-3 hover:bg-surface-elevated transition-colors">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-card">
                {pl.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pl.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center" style={{ background: artworkFallback(pl.name) }}>
                    <Music2 className="h-7 w-7 text-white/80" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate text-sm font-semibold">{pl.name}</p>
                <p className="truncate text-xs text-muted">{pl.description ?? `${pl.trackCount} tracks`}</p>
                <p className="mt-1 text-xs text-muted-2">{pl.trackCount} songs</p>
              </div>
              <button
                onClick={() => setMenuId((v) => v === pl.id ? null : pl.id)}
                className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-full hover:bg-card"
                aria-label="More"
              >
                <MoreVertical className="h-4 w-4 text-muted" />
              </button>
              {menuId === pl.id && (
                <div className="absolute right-2 top-10 z-10 w-36 rounded-xl border border-border bg-background-elevated p-1 shadow-float">
                  <button
                    onClick={() => del(pl.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-surface"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background-elevated p-5 shadow-float">
            <h2 className="text-base font-semibold">New playlist</h2>
            <p className="text-xs text-muted">Give it a name. You can add tracks later.</p>
            <div className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Playlist name"
                maxLength={60}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description (optional)"
                maxLength={280}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {err && <p className="text-xs text-danger">{err}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm hover:bg-surface">Cancel</button>
                <button
                  onClick={create}
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />} Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
