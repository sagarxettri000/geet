export interface TrackEventPayload {
  eventType: string;
  trackId?: string;
  position?: number;
  duration?: number;
  source?: string;
}

let sessionId: string | null = null;
const batch: Array<Record<string, unknown>> = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.sessionStorage.getItem("geet:session-id");
    if (existing) {
      sessionId = existing;
      return existing;
    }
  } catch {}
  sessionId = `s_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  try {
    window.sessionStorage.setItem("geet:session-id", sessionId);
  } catch {}
  return sessionId;
}

function getDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

function flush() {
  if (batch.length === 0) return;
  const payload = batch.splice(0, 20);
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  try {
    fetch("/api/recommendation-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function trackEvent(e: TrackEventPayload) {
  if (typeof window === "undefined") return;
  batch.push({ ...e, sessionId: getSessionId(), device: getDevice() });
  if (batch.length >= 20) flush();
  else if (!timer) timer = setTimeout(flush, 4000);
}

export function flushEvents() {
  if (typeof window !== "undefined") flush();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => flush());
}