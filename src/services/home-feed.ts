import { db } from "@/lib/db";
import { trackToDTO } from "@/services/music";
import { getRankedFeed } from "@/services/recommend";
import { getTrendingTrackIds } from "@/services/recommend/trending";
import { FEED } from "@/services/recommend/weights";
import {
  CAT_ORDER,
  composeNext,
  decodeCursor,
  encodeCursor,
  FeedCat,
  QueueLayout,
  randomSeed,
  tagRankedSource,
} from "@/services/recommend/feed-curation";
import type { Track } from "@/types/music";

interface Meta {
  reason: string;
  source: string;
  score?: number;
}

interface Population {
  queues: QueueLayout;
  metaById: Map<string, Meta>;
  total: number;
}

export interface HomeFeedPage {
  items: Track[];
  nextCursor: string | null;
  hasMore: boolean;
  debug?: Array<{
    trackId: string;
    reason: string;
    source: string;
    issue?: string;
    score?: number;
  }>;
}

export interface HomeFeedOptions {
  limit?: number;
  cursor?: string;
  debug?: boolean;
}

const popCache = new Map<string, { at: number; pop: Population }>();

export async function getHomeFeedPage(
  userId: string,
  opts: HomeFeedOptions = {}
): Promise<HomeFeedPage> {
  const limit = Math.min(
    FEED.maxLimit,
    Math.max(1, Math.floor(opts.limit ?? FEED.defaultPageSize))
  );
  const decoded = decodeCursor(opts.cursor);
  const seed = decoded?.seed ?? randomSeed();
  const pointers = decoded?.pointers ?? CAT_ORDER.map(() => 0);

  const pop = await getPopulation(userId, seed);
  const { ids, nextPointers, hasMore } = composeNext(
    pop.queues,
    pointers,
    limit
  );

  const likedSet = new Set<string>();
  let rows: Array<{
    id: string;
  } & Parameters<typeof trackToDTO>[0]> = [];
  if (ids.length > 0) {
    const [likedRows, found] = await Promise.all([
      db.likedTrack.findMany({ where: { userId }, select: { trackId: true } }),
      db.track.findMany({
        where: { id: { in: ids } },
        include: { sources: true },
      }),
    ]);
    for (const l of likedRows) likedSet.add(l.trackId);
    rows = found as typeof rows;
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  const items: Track[] = [];
  const debug: NonNullable<HomeFeedPage["debug"]> = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    items.push(trackToDTO(row, { liked: likedSet.has(id) }));
    if (opts.debug) {
      const meta = pop.metaById.get(id);
      debug.push({
        trackId: id,
        reason: meta?.reason ?? "n/a",
        source: meta?.source ?? "n/a",
        score: meta?.score,
      });
    }
  }

  return {
    items,
    nextCursor: hasMore
      ? encodeCursor(seed, nextPointers.slice(0, CAT_ORDER.length))
      : null,
    hasMore,
    ...(opts.debug ? { debug } : {}),
  };
}

async function getPopulation(userId: string, seed: string): Promise<Population> {
  const key = `${userId}:${seed}`;
  const hit = popCache.get(key);
  if (hit && Date.now() - hit.at < FEED.cacheMs) return hit.pop;

  const pop = await buildPopulation(userId, seed);
  if (popCache.size > 300) popCache.clear();
  popCache.set(key, { at: Date.now(), pop });
  return pop;
}

interface FeedContext {
  liked: Set<string>;
  negated: Set<string>;
  impressions: Map<string, number>;
  plays: Map<string, number>;
  dismissed: Set<string>;
}

async function loadContext(userId: string): Promise<FeedContext> {
  const liked = new Set<string>();
  const negated = new Set<string>();
  const impressions = new Map<string, number>();
  const plays = new Map<string, number>();

  const since = new Date(
    Date.now() - FEED.signalWindowDays * 24 * 60 * 60 * 1000
  );
  const [likedRows, feedback, events] = await Promise.all([
    db.likedTrack.findMany({ where: { userId }, select: { trackId: true } }),
    db.recommendationFeedback.findMany({
      where: { userId, feedbackType: { in: ["hide", "not_interested", "dislike"] } },
      select: { trackId: true },
    }),
    db.userEvent.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { eventType: true, trackId: true },
    }),
  ]);

  for (const l of likedRows) liked.add(l.trackId);
  for (const f of feedback) if (f.trackId) negated.add(f.trackId);
  for (const e of events) {
    if (!e.trackId) continue;
    if (e.eventType === "impression")
      impressions.set(e.trackId, (impressions.get(e.trackId) ?? 0) + 1);
    if (e.eventType === "play_start")
      plays.set(e.trackId, (plays.get(e.trackId) ?? 0) + 1);
  }

  const dismissed = new Set<string>();
  for (const [trackId, count] of impressions) {
    if (
      count >= FEED.dismissImpressions &&
      (plays.get(trackId) ?? 0) === 0 &&
      !liked.has(trackId)
    ) {
      dismissed.add(trackId);
    }
  }

  return { liked, negated, impressions, plays, dismissed };
}

async function buildPopulation(
  userId: string,
  seed: string
): Promise<Population> {
  const rand = mulberry32(hash(seed));
  const ctx = await loadContext(userId);

  const queues = Object.fromEntries(
    CAT_ORDER.map((cat) => [cat, [] as string[]])
  ) as QueueLayout;
  const metaById = new Map<string, Meta>();

  const exclude = new Set<string>();
  const assigned = new Set<string>();
  let ranked: Array<{ track: Track; reason?: string; source?: string; score?: number }> = [];
  try {
    const feed = await getRankedFeed(userId, FEED.rankedCap, 0);
    ranked = feed.items;
  } catch {}

  for (const it of ranked) {
    const id = it.track.id;
    if (!id || ctx.negated.has(id) || assigned.has(id)) continue;
    exclude.add(id);
    assigned.add(id);
    const source = it.source ?? "user_interest";
    const cat = ctx.dismissed.has(id) ? "ignored" : tagRankedSource(source);
    queues[cat].push(id);
    metaById.set(id, { reason: it.reason ?? source, source, score: it.score });
  }

  const trendingIds = new Set(await getTrendingTrackIds(200).catch(() => []));
  const freshSince = Date.now() - FEED.freshNewDays * 24 * 60 * 60 * 1000;

  const rows = await db.track.findMany({
    where: exclude.size > 0 ? { id: { notIn: [...exclude] } } : undefined,
    include: { sources: true },
    orderBy: [{ popularity: "desc" }, { createdAt: "desc" }],
    take: FEED.catalogCap,
  });

  for (const t of rows) {
    const id = t.id;
    if (ctx.negated.has(id)) continue;
    const cat: FeedCat = ctx.dismissed.has(id)
      ? "ignored"
      : ctx.plays.get(id)
        ? "heard"
        : trendingIds.has(id)
          ? "trending"
          : t.createdAt.getTime() > freshSince
            ? "fresh"
            : "popular";
    const reason =
      cat === "heard"
        ? "in_your_history"
        : cat === "trending"
          ? "trending"
          : cat === "fresh"
            ? "new_release"
            : cat === "ignored"
              ? "seen_but_unplayed"
              : "popular";
    queues[cat].push(id);
    metaById.set(id, { reason, source: cat });
  }

  for (const cat of CAT_ORDER) shuffleInPlace(queues[cat], rand);
  for (const cat of CAT_ORDER) queues[cat] = unique(queues[cat]);

  const total = CAT_ORDER.reduce((sum, cat) => sum + queues[cat].length, 0);
  return { queues, metaById, total };
}

function unique(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function clearHomeFeedCache() {
  popCache.clear();
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}