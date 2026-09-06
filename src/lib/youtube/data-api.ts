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

const REUSABLE_PARTS = "snippet";

export async function searchYouTubeMusic(query: string, maxResults = 20) {
  return searchYouTubeVideos({ query, maxResults, categoryId: "10" });
}

// Podcasts aren't in YouTube's Music category, so no category filter — and paginate
// several pages deep so "show all episodes" actually gets everything available.
export async function searchYouTubePodcasts(query: string, maxResults = 100) {
  return searchYouTubeVideos({ query, maxResults });
}

async function searchYouTubeVideos({
  query,
  maxResults = 20,
  categoryId,
  regionCode,
  order,
  withDurations = true,
}: {
  query: string;
  maxResults?: number;
  categoryId?: string;
  regionCode?: string;
  order?: "relevance" | "viewCount";
  withDurations?: boolean;
}): Promise<YoutubeSearchHit[]> {
  const key = apiKey();
  const hits: YoutubeSearchHit[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;

  while (hits.length < maxResults) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", REUSABLE_PARTS);
    url.searchParams.set("type", "video");
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(Math.min(50, maxResults - hits.length)));
    if (categoryId) url.searchParams.set("videoCategoryId", categoryId);
    if (regionCode) url.searchParams.set("regionCode", regionCode);
    if (order) url.searchParams.set("order", order);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    url.searchParams.set("key", key);

    const res = await fetchJson(searchResponseSchema, url);
    const videos = res.items.filter((it): it is typeof it & { id: { videoId: string } } => !!it.id.videoId);
    for (const it of videos) {
      if (seen.has(it.id.videoId)) continue;
      seen.add(it.id.videoId);
      hits.push({
        videoId: it.id.videoId,
        title: it.snippet.title,
        channelTitle: it.snippet.channelTitle,
        description: it.snippet.description ?? null,
        publishedAt: it.snippet.publishedAt,
        thumbnailUrl: pickThumbnail(it.snippet.thumbnails),
        durationSec: null,
      });
      if (hits.length >= maxResults) break;
    }

    if (hits.length >= maxResults || !res.nextPageToken) break;
    pageToken = res.nextPageToken;
  }

  if (withDurations) {
    await attachDurations(hits);
  }
  return hits;
}

async function attachDurations(hits: YoutubeSearchHit[]) {
  const durations = await fetchDurations(hits.map((h) => h.videoId));
  for (const hit of hits) {
    hit.durationSec = durations.get(hit.videoId) ?? null;
  }
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

  const res = await fetchJson(trendingResponseSchema, url);
  return res.items.map(mapTrendingItem);
}

// Podcasts have no dedicated chart category, so the trending rail is built by
// searching live talk/interview/story terms (by view count) and merging them,
// biased toward full-length episodes over Shorts/clips. Queries are rotated
// round-robin so one broad term can't drown out the variety.
const PODCAST_TRENDING_QUERIES: readonly string[] = [
  "raj shamani podcast",
  "podcast interview",
  "podcast",
  "storytime podcast",
];

export async function trendingYouTubePodcasts(
  regionCode = "IN",
  maxResults = 30
): Promise<YoutubeSearchHit[]> {
  const buckets = await Promise.all(
    PODCAST_TRENDING_QUERIES.map((q) =>
      searchYouTubeVideos({
        query: q,
        maxResults: 12,
        regionCode,
        order: "viewCount",
        withDurations: false,
      })
    )
  );

  const merged: YoutubeSearchHit[] = [];
  const seen = new Set<string>();
  const cursor = buckets.map(() => 0);
  let progressed = true;
  while (merged.length < maxResults && progressed) {
    progressed = false;
    for (let b = 0; b < buckets.length && merged.length < maxResults; b++) {
      const bucket = buckets[b];
      while (cursor[b] < bucket.length) {
        const hit = bucket[cursor[b]++];
        if (!hit || seen.has(hit.videoId)) continue;
        seen.add(hit.videoId);
        merged.push(hit);
        progressed = true;
        break;
      }
    }
  }

  await attachDurations(merged);

  // Bias toward full-length episodes (>10 min) so the rail feels like a talk
  // show instead of short clips, without dropping shorts entirely.
  const long = merged.filter((h) => (h.durationSec ?? 0) >= 600);
  const short = merged.filter((h) => (h.durationSec ?? 0) < 600);
  return [...long, ...short].slice(0, maxResults);
}

function mapTrendingItem(
  it: z.infer<typeof trendingResponseSchema>["items"][number]
): YoutubeSearchHit {
  return {
    videoId: it.id,
    title: it.snippet.title,
    channelTitle: it.snippet.channelTitle,
    description: it.snippet.description ?? null,
    publishedAt: it.snippet.publishedAt,
    thumbnailUrl: pickThumbnail(it.snippet.thumbnails),
    durationSec: parseIsoDuration(it.contentDetails.duration ?? ""),
    viewCount: it.statistics?.viewCount ? Number(it.statistics.viewCount) : null,
    likeCount: it.statistics?.likeCount ? Number(it.statistics.likeCount) : null,
  };
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

    const res = await fetchJson(videosResponseSchema, url);
    for (const item of res.items) {
      durations.set(item.id, parseIsoDuration(item.contentDetails.duration ?? ""));
    }
  }
  return durations;
}

async function fetchJson<T extends { items: unknown[] }>(
  schema: z.ZodType<T>,
  url: URL
): Promise<T> {
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
    const reason = (body as { error?: { errors?: { reason?: string }[] } })?.error?.errors?.[0]?.reason ?? "";
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
  return parsed.data;
}

function safeJson(res: Response): Promise<Record<string, unknown> | null> {
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