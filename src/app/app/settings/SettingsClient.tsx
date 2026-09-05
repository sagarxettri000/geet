"use client";
import { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/player";

type Pref = { theme: string; volume: number; muted: boolean; repeatMode: string; shuffle: boolean };

export function SettingsClient({ initial }: { initial: Pref }) {
  const [theme, setTheme] = useState(initial.theme);
  const [volume, setVolume] = useState(initial.volume);
  const [muted, setMuted] = useState(initial.muted);
  const [repeatMode, setRepeatMode] = useState(initial.repeatMode);
  const [shuffle, setShuffle] = useState(initial.shuffle);
  const [saving, setSaving] = useState(false);

  // player store sync
  const setPlayerVolume = usePlayerStore((s) => s.setVolume);
  const setPlayerMuted = usePlayerStore((s) => s.setMuted);
  const setPlayerShuffle = usePlayerStore((s) => s.setShuffle);
  const setPlayerRepeat = usePlayerStore((s) => s.setRepeat);

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);

  const patch = async (data: Partial<Pref>) => {
    setSaving(true);
    try {
      await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border glass p-5">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <p className="text-xs text-muted">Toggle theme. Electric purple #8B5CF6 is the primary accent in both modes.</p>
        <div className="mt-3 flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTheme(t); patch({ theme: t }); }}
              className={`rounded-full px-5 py-2 text-sm font-medium border transition-colors capitalize ${theme === t ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border hover:bg-surface-elevated"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <h2 className="text-sm font-semibold">Playback</h2>
        <div>
          <label className="text-xs font-medium">Volume: {muted ? 0 : volume}%</label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v); setMuted(v === 0); setPlayerVolume(v); setPlayerMuted(v === 0); patch({ volume: v, muted: v === 0 });
              }}
              className="flex-1 accent-primary"
            />
            <button onClick={() => { const n = !muted; setMuted(n); setPlayerMuted(n); patch({ muted: n }); }} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
              {muted ? "Unmute" : "Mute"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={shuffle} onChange={(e) => { setShuffle(e.target.checked); setPlayerShuffle(e.target.checked); patch({ shuffle: e.target.checked }); }} />
            Shuffle
          </label>
          <label className="flex items-center gap-2 text-sm">
            Repeat
            <select value={repeatMode} onChange={(e) => { setRepeatMode(e.target.value); setPlayerRepeat(e.target.value as any); patch({ repeatMode: e.target.value }); }} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
              <option value="off">Off</option>
              <option value="all">All</option>
              <option value="one">One</option>
            </select>
          </label>
        </div>
        {saving && <p className="text-xs text-muted">Saving…</p>}
      </div>
    </div>
  );
}
