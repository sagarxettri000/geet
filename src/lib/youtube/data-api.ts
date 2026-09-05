import { z } from "zod";

const searchResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.object({ videoId: z.string().optional() }).catchall(z.unknown()),
      snippet: z.object({
        title: z.string(),
        channelTitle: z.string(),
        description: z.string().optional().nullable(),
        publishedAt: z.string(),
        thumbnails: z
          .object({
            maxres: z.object({ url: z.string().optional() }).optional(),
            high: z.object({ url: z.string().optional() }).optional(),
            medium: z.object({ url: z.string().optional() }).optional(),
            default: z.object({ url: z.string().optional() }).optional(),
          })
          .catchall(z.unknown())
          .optional()
          .nullable(),
      }),
    })
  ),
  nextPageToken: z.string().optional().nullable(),
});

const videosResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      contentDetails: z.object({
        duration: z.string().optional().nullable(),
      }),
    })
  ),
});

const trendingResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z.object({
        title: z.string(),
        channelTitle: z.string(),
        description: z.string().optional().nullable(),
        publishedAt: z.string(),
        thumbnails: z
          .object({
            maxres: z.object({ url: z.string().optional() }).optional(),
            high: z.object({ url: z.string().optional() }).optional(),
            medium: z.object({ url: z.string().optional() }).optional(),
            default: z.object({ url: z.string().optional() }).optional(),
          })
          .catchall(z.unknown())
          .optional()
          .nullable(),
      }),
      contentDetails: z.object({
        duration: z.string().optional().nullable(),
      }),
      statistics: z
        .object({
          viewCount: z.string().optional().nullable(),
          likeCount: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
    })
  ),
});

export interface YoutubeSearchHit {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string | null;
  publishedAt: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  viewCount?: number | null;
  likeCount?: number | null;
}

export class DataApiError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | "no-key"
      | "quota"
      | "rate-limit"
      | "network"
      | "invalid"
      | "server"
  ) {
    super(message);
    this.name = "DataApiError";
  }
}

function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new DataApiError(
      "YouTube Data API key not configured",
      "no-key"
    );
  }
  return key;
}

const SEARCH_CATEGORY_IDS = ["10"]; // Music
const REUSABLE_PARTS = "snippet";

export async function searchYouTubeMusic(query: string, maxResults = 20) {
  const key = apiKey();
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", REUSABLE_PARTS);
  url.searchParams.set("type", "video");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("videoCategoryId", SEARCH_CATEGORY_IDS[0]);
  url.searchParams.set("key", key);

  const items = await fetchJson(searchResponseSchema, url);
  const videos = items.filter((it): it is (typeof it & { id: { videoId: string } }) => !!it.id.videoId);
  if (videos.length === 0) return [];

  const videoIds = videos.map((it) => it.id.videoId);
  const durations = await fetchDurations(videoIds);

  const hits: YoutubeSearchHit[] = videos.map((it) => {
    return {
      videoId: it.id.videoId,
      title: it.snippet.title,
      channelTitle: it.snippet.channelTitle,
      description: it.snippet.description ?? null,
      publishedAt: it.snippet.publishedAt,
      thumbnailUrl: pickThumbnail(it.snippet.thumbnails),
      durationSec: durations.get(it.id.videoId) ?? null,
    };
  });

  return hits;
}

function pickThumbnail(
  thumbnails: z.infer<typeof searchResponseSchema>["items"][number]["snippet"]["thumbnails"]
): string | null {
  return (
    thumbnails?.maxres?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    null
  );
}

// Real YouTube Music chart — the actual most-popular music videos for a market.
export async function trendingYouTubeMusic(
  regionCode = "IN",
  maxResults = 14
): Promise<YoutubeSearchHit[]> {
  const key = apiKey();
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("videoCategoryId", "10"); // Music
  url.searchParams.set("regionCode", regionCode);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", key);

  const items = await fetchJson(trendingResponseSchema, url);
  return items.map((it) => ({
    videoId: it.id,
    title: it.snippet.title,
    channelTitle: it.snippet.channelTitle,
    description: it.snippet.description ?? null,
    publishedAt: it.snippet.publishedAt,
    thumbnailUrl: pickThumbnail(it.snippet.thumbnails),
    durationSec: parseIsoDuration(it.contentDetails.duration ?? ""),
    viewCount: it.statistics?.viewCount ? Number(it.statistics.viewCount) : null,
    likeCount: it.statistics?.likeCount ? Number(it.statistics.likeCount) : null,
  }));
}

async function fetchDurations(videoIds: string[]) {
  const durations = new Map<string, number>();
  const key = apiKey();

  // videos.list accepts up to 50 IDs per request.
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", key);

    const items = await fetchJson(videosResponseSchema, url);
    for (const item of items) {
      durations.set(item.id, parseIsoDuration(item.contentDetails.duration ?? ""));
    }
  }
  return durations;
}

async function fetchJson<T extends { items: unknown[] }>(
  schema: z.ZodType<T>,
  url: URL
): Promise<T["items"]> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new DataApiError("YouTube network failure", "network");
  }

  if (res.status === 403) {
    const body = await safeJson(res);
    const reason = (body?.error?.errors?.[0]?.reason ?? "") as string;
    if (reason === "quotaExceeded") {
      throw new DataApiError("Daily YouTube search quota exceeded", "quota");
    }
    if (reason === "dailyLimitExceeded") {
      throw new DataApiError("Daily YouTube search limit reached", "quota");
    }
    throw new DataApiError("YouTube API access denied", "server");
  }
  if (res.status === 429) {
    throw new DataApiError("YouTube is rate limiting requests", "rate-limit");
  }
  if (!res.ok) {
    throw new DataApiError(`YouTube API error (${res.status})`, "server");
  }

  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) {
    throw new DataApiError("Unexpected YouTube response", "invalid");
  }
  return parsed.data.items;
}

function safeJson(res: Response): Promise<Record<string, any> | null> {
  return res.json().catch(() => null);
}

export function parseIsoDuration(input: string): number {
  const match = input.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? "0", 10);
  const minutes = parseInt(match[2] ?? "0", 10);
  const seconds = parseInt(match[3] ?? "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}