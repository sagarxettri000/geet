"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Heart, Trash2, Edit3, ChevronUp, ChevronDown, Plus, X, Globe, Lock } from "lucide-react";
import { usePlayerStore } from "@/stores/player";
import type { Track } from "@/types/music";
import { formatDuration, artworkFallback } from "@/lib/utils";

export function PlaylistControls({
  playlistId,
  tracks,
  isOwner,
  initialName,
  initialDesc,
  initialPublic,
}: {
  playlistId: string;
  tracks: Track[];
  isOwner: boolean;
  initialName: string;
  initialDesc: string | null;
  initialPublic: boolean;
}) {
  const setQueue = usePlayerStore((s) => s.setQueue);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDesc ?? "");
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/playlists/${playlistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: desc.trim() || null, isPublic }),
    });
    setSaving(false);
    if (res.ok) { setEditing(false); router.refresh(); }
  };
  const del = async () => {
    if (!confirm("Delete this playlist?")) return;
    await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
    router.push("/app/playlists");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => tracks.length && setQueue(tracks, 0)} disabled={!tracks.length} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 shadow">
        <Play className="h-4 w-4 fill-current" /> Play
      </button>
      {isOwner && !editing && (
        <>
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm hover:bg-surface-elevated">
            <Edit3 className="h-4 w-4" /> Edit
          </button>
          <button onClick={del} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm text-danger hover:bg-surface-elevated">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </>
      )}
      {editing && (
        <div className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-surface p-3 md:w-auto md:flex-row md:items-center">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={60} className="h-9 rounded-xl border border-border bg-background-elevated px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" maxLength={280} className="h-9 rounded-xl border border-border bg-background-elevated px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary md:w-56" />
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public
          </label>
          <button onClick={save} disabled={saving || !name.trim()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          <button onClick={() => setEditing(false)} className="rounded-full border border-border px-4 py-2 text-sm">Cancel</button>
        </div>
      )}
    </div>
  );
}

export function PlaylistTracks({
  playlistId,
  initialTracks,
  isOwner,
}: {
  playlistId: string;
  initialTracks: { track: Track; trackId: string }[];
  isOwner: boolean;
}) {
  const [items, setItems] = useState(initialTracks);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const flat: Track[] = items.map((i) => i.track);

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    setItems(next);
    await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((x) => x.trackId) }),
    });
  };

  const remove = async (trackId: string) => {
    await fetch(`/api/playlists/${playlistId}/tracks?trackId=${encodeURIComponent(trackId)}`, { method: "DELETE" });
    setItems((prev) => prev.filter((p) => p.trackId !== trackId));
  };

  const addTrackId = async (trackId: string) => {
    const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
    if (res.ok) {
      const j = await res.json();
      if (j.tracks) {
        const mapped = (j.tracks as { track: Track; position: number; playlistTrackId: string }[]).map((t) => ({ track: t.track, trackId: (t.track as any).id }));
        // refetch via mapped if available
        // fallback just reload
        setItems(mapped.length ? mapped as any : [...items]);
      } else window.location.reload();
    }
  };

  const [addInput, setAddInput] = useState("");

  return (
    <div className="space-y-3">
      {isOwner && (
        <div className="flex gap-2">
          <input value={addInput} onChange={(e) => setAddInput(e.target.value)} placeholder="Track ID to add" className="h-9 flex-1 rounded-xl border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <button onClick={() => addInput.trim() && addTrackId(addInput.trim())} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4 inline mr-1" /> Add
          </button>
        </div>
      )}
      <div className="divide-y divide-border/50 rounded-2xl border border-border bg-surface/50 overflow-hidden">
        {items.map((entry, i) => {
          const t = entry.track;
          return (
            <div key={entry.trackId} className="flex items-center gap-2 px-3 py-2.5 hover:bg-surface-elevated/60 group">
              <span className="w-6 text-center text-xs text-muted">{i + 1}</span>
              {t.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.thumbnailUrl} alt="" className="h-10 w-10 rounded-md object-cover shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-md shrink-0" style={{ background: artworkFallback(t.title) }} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="truncate text-xs text-muted">{t.artist} · {formatDuration(t.durationSec)}</p>
              </div>
              {isOwner && (
                <div className="flex flex-col gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded bg-surface border border-border p-1 disabled:opacity-30">
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded bg-surface border border-border p-1 disabled:opacity-30">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              )}
              {isOwner && (
                <button onClick={() => remove(entry.trackId)} className="p-2 text-muted hover:text-danger">
                  <X className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setQueue(flat, i)} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
              </button>
            </div>
          );
        })}
        {!items.length && <p className="py-10 text-center text-sm text-muted">No tracks yet.</p>}
      </div>
    </div>
  );
}
