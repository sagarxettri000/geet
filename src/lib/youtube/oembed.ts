import { watchUrlFor } from "@/lib/youtube/video";

export interface OEmbedResult {
  title: string;
  authorName: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export class OEmbedError extends Error {
  constructor(
    message: string,
    public readonly kind: "network" | "not-found" | "invalid" | "server"
  ) {
    super(message);
    this.name = "OEmbedError";
  }
}

/**
 * Official, key-less YouTube metadata endpoint. Returns title / author /
 * thumbnail for a specific public video. Used by GEET for the paste-a-link
 * intake flow. Does NOT search — search requires the YouTube Data API.
 */
export async function fetchOEmbed(videoId: string): Promise<OEmbedResult> {
  if (!videoId) throw new OEmbedError("Missing video id", "invalid");

  const target = watchUrlFor(videoId);
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    target
  )}&format=json`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "GEET-Music/1.0 (+https://geet.app)" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new OEmbedError(
      `Could not reach YouTube (${err instanceof Error ? err.name : "error"})`,
      "network"
    );
  }

  if (res.status === 404) {
    throw new OEmbedError("Video not found or unavailable", "not-found");
  }
  if (res.status === 401 || res.status === 403) {
    throw new OEmbedError("YouTube refused the metadata request", "server");
  }
  if (!res.ok) {
    throw new OEmbedError(
      `Metadata request failed (${res.status})`,
      "server"
    );
  }

  try {
    const data = (await res.json()) as {
      title?: unknown;
      author_name?: unknown;
      thumbnail_url?: unknown;
      width?: unknown;
      height?: unknown;
    };

    if (typeof data.title !== "string" || typeof data.author_name !== "string") {
      throw new OEmbedError("Unexpected oEmbed payload", "invalid");
    }

    let thumbnailUrl: string | null = null;
    if (typeof data.thumbnail_url === "string") {
      // oEmbed returns hqdefault by default; upgrade to the highest available.
      thumbnailUrl = data.thumbnail_url.replace(
        /\/vi\/[a-zA-Z0-9_-]+\/[a-z]+(_?)\.jpg/,
        `/vi/${videoId}/hqdefault.jpg`
      );
    }

    return {
      title: data.title,
      authorName: data.author_name,
      thumbnailUrl: thumbnailUrl ?? thumbnailPlaceholder(videoId),
      width: typeof data.width === "number" ? data.width : 480,
      height: typeof data.height === "number" ? data.height : 360,
    };
  } catch (err) {
    if (err instanceof OEmbedError) throw err;
    throw new OEmbedError("Unexpected oEmbed response", "invalid");
  }
}

export function thumbnailPlaceholder(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}