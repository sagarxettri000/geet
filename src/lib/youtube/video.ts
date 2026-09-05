const YT_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

const URL_PATTERNS: RegExp[] = [
  /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/watch\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
];

export function isYouTubeVideoId(value: string): boolean {
  return YT_VIDEO_ID_RE.test(value.trim());
}

export function parseYouTubeInput(value: string): string | null {
  const trimmed = value.trim();
  if (isYouTubeVideoId(trimmed)) return trimmed;

  // Try URL parsing first for robustness (handles extra query params, timestamps, playlists)
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be" || host === "m.youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      if (isYouTubeVideoId(id)) return id;
    }
    if (host.includes("youtube.com") || host.includes("m.youtube.com") || host.includes("music.youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && isYouTubeVideoId(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      // /embed/ID, /shorts/ID, /live/ID, /watch/ID
      if (parts.length >= 2 && ["embed", "shorts", "live", "watch"].includes(parts[0])) {
        const cand = parts[1];
        if (isYouTubeVideoId(cand)) return cand;
      }
    }
  } catch {}

  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1] && isYouTubeVideoId(match[1])) return match[1];
  }
  return null;
}

export function watchUrlFor(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}