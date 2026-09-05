"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileEditor({
  initialDisplayName,
  initialBio,
}: {
  initialDisplayName: string;
  initialBio: string;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName.trim() || null, bio: bio.trim() || null }),
    });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setMsg(j.error ?? "Failed to save"); return; }
    setMsg("Saved");
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-border glass p-5 space-y-4">
      <h2 className="text-sm font-semibold">Edit profile</h2>
      <div>
        <label className="text-xs font-medium text-muted">Display name</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} placeholder="Your name" className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted">Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3} placeholder="Tell us about your music taste" className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        <p className="text-[11px] text-muted text-right">{bio.length}/280</p>
      </div>
      {msg && <p className={`text-xs ${msg === "Saved" ? "text-success" : "text-danger"}`}>{msg}</p>}
      <button onClick={save} disabled={saving} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
