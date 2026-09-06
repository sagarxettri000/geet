export const CONSENT_KEY = "geet:cookie-consent";
export const CONSENT_VERSION = 1;

export interface CookieConsent {
  version: number;
  necessary: boolean;
  youtube: boolean;
  state: "accepted" | "rejected" | "custom";
  updatedAt: string;
}

export function readConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(base: Partial<CookieConsent>): CookieConsent {
  const existing = readConsent();
  const consent: CookieConsent = {
    version: CONSENT_VERSION,
    necessary: true,
    youtube: existing?.youtube ?? true,
    state: base.state ?? existing?.state ?? "custom",
    updatedAt: new Date().toISOString(),
    ...base,
  };
  consent.version = CONSENT_VERSION;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch {}
  }
  return consent;
}

export function clearConsent() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {}
}

// YouTube embeds are essential to playback. We never pre-load the third-party
// YouTube script before a choice is made; the user's first play action is the
// consenting action. This returns whether an explicit non-essential block is in
// effect (youtube=false) so the host can still defer to the user's play click.
export function isYouTubeBlocked(consent: CookieConsent | null): boolean {
  if (!consent) return false;
  return consent.youtube === false;
}