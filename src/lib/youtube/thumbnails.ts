export type ThumbnailSize =
  | "maxresdefault"
  | "sddefault"
  | "hqdefault"
  | "mqdefault"
  | "default";

export const THUMBNAIL_PRIORITY: ThumbnailSize[] = [
  "maxresdefault",
  "sddefault",
  "hqdefault",
  "mqdefault",
  "default",
];

export function youtubeThumbnail(videoId: string, size: ThumbnailSize): string {
  return `https://i.ytimg.com/vi/${videoId}/${size}.jpg`;
}

/**
 * Builds an ordered candidate list of thumbnails so a client can progressively
 * try larger sizes and fall back gracefully.
 */
export function thumbnailCandidates(videoId: string): string[] {
  return THUMBNAIL_PRIORITY.map((size) => youtubeThumbnail(videoId, size));
}

export function bestThumbnail(videoId: string): string {
  return youtubeThumbnail(videoId, "hqdefault");
}