"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readConsent, writeConsent } from "@/lib/consent";
import { CookieSettings } from "./CookieSettings";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!readConsent()) setVisible(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <>
      {!settingsOpen && (
        <div
          role="region"
          aria-label="Cookie notice"
          className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/90"
        >
          <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm leading-6 text-muted">
              GEET only sets cookies that are necessary for signing in and storing your
              preferences. Music plays through YouTube&apos;s official player, which loads{" "}
              <em>only when you press play</em>. We don&apos;t run advertising or third-party
              analytics.{" "}
              <Link href="/cookies" className="underline underline-offset-2 hover:text-foreground">
                Read the cookie policy
              </Link>
              .
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
              >
                Manage settings
              </button>
              <button
                type="button"
                onClick={() => writeConsent({ state: "accepted" })}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-settings-title"
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
        >
          <div className="w-full max-w-lg rounded-t-2xl border border-border bg-background p-6 shadow-float sm:rounded-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 id="cookie-settings-title" className="font-display text-lg font-semibold">
                Cookie settings
              </h2>
              <button
                type="button"
                aria-label="Close cookie settings"
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-2 text-muted hover:bg-surface hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <p className="mb-5 mt-2 text-sm leading-6 text-muted">
              You can change these choices here at any time.
            </p>
            <CookieSettings onDone={() => setSettingsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export default CookieBanner;