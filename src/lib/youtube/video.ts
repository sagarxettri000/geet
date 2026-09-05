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

  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1] && isYouTubeVideoId(match[1])) return match[1];
  }
  return null;
}

export function watchUrlFor(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}