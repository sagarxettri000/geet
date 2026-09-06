"use client";

import { useState } from "react";
import { readConsent, writeConsent, clearConsent } from "@/lib/consent";

export function CookieSettings({ onDone }: { onDone?: () => void }) {
  const initial = readConsent();
  const [youtube, setYoutube] = useState(initial?.youtube ?? true);

  const finish = (state: "accepted" | "rejected" | "custom", yt: boolean) => {
    writeConsent({ state, youtube: yt });
    onDone?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-semibold">Strictly necessary</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Authentication session cookie and security protections. Required to sign in
            and use the app.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
          Always on
        </span>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-semibold">Personalization &amp; usage</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            First-party activity signals (plays, likes, searches) used only to build your
            own recommendations. Stored on our servers, never sold.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
          Always on
        </span>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-semibold">YouTube content</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            GEET plays music through YouTube&apos;s official embedded player and shows
            YouTube artwork. This component always only loads when you press play, so your
            play action is your consent. Leaving this off defers YouTube loading until you
            play a video anyway.
          </p>
        </div>
        <label className="shrink-0">
          <input
            type="checkbox"
            checked={youtube}
            onChange={(e) => setYoutube(e.target.checked)}
            className="h-4 w-4 accent-[#8B5CF6]"
          />
          <span className="sr-only">YouTube content</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            clearConsent();
            onDone?.();
          }}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
        >
          Withdraw consent
        </button>
        <button
          type="button"
          onClick={() => finish("rejected", false)}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
        >
          Reject non-essential
        </button>
        <button
          type="button"
          onClick={() => finish("accepted", youtube)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Save and accept
        </button>
      </div>
    </div>
  );
}

export default CookieSettings;