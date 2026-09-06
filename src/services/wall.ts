import { db } from "@/lib/db";
import { trackToDTO } from "@/services/music";
import { getRankedFeed } from "@/services/recommend";
import type { Track } from "@/types/music";

const RANKED_CAP = 300;
const CATALOG_CAP = 5000;
const WALL_TTL_MS = 5 * 60 * 1000;
const SIGNAL_WINDOW_DAYS = 30;
const DISMISS_IMPRESSIONS = 3;

interface WallEntry {
  id: string;
  dto: Track;
}

interface WallPage {
  items: Track[];
  nextOffset: number;
  hasMore: boolean;
}

const wallCache = new Map<string, { at: number; entries: WallEntry[] }>();

export async function getWallPage(
  userId: string,
  offset: number,
  limit = 48,
  variant = "default"
): Promise<WallPage> {
  const entries = await ensureWall(userId, variant);
  const page = entries.slice(offset, offset + limit);
  return {
    items: page.map((e) => e.dto),
    nextOffset: offset + page.length,
    hasMore: offset + page.length < entries.length,
  };
}

async function ensureWall(userId: string, variant: string): Promise<WallEntry[]> {
  const key = `${userId}:${variant}`;
  const hit = wallCache.get(key);
  if (hit && Date.now() - hit.at < WALL_TTL_MS) return hit.entries;

  const rand = mulberry32(hash(variant));
  const ctx = await loadContext(userId);

  const ranked = (await buildRanked(userId, ctx)).filter((e) => !ctx.dismissed.has(e.id));
  shuffleInPlace(ranked, rand);

  const exclude = new Set<string>();
  for (const e of ranked) exclude.add(e.id);

  const catalog = await buildCatalog(userId, exclude, ctx, rand);
  const entries = [...ranked, ...catalog];

  wallCache.set(key, { at: Date.now(), entries });
  return entries;
}

interface WallContext {
  liked: Set<string>;
  negated: Set<string>;
  impressions: Map<string, number>;
  plays: Map<string, number>;
  dismissed: Set<string>;
}

async function loadContext(userId: string): Promise<WallContext> {
  const liked = new Set<string>();
  const negated = new Set<string>();
  const impressions = new Map<string, number>();
  const plays = new Map<string, number>();

  const since = new Date(Date.now() - SIGNAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
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
    if (e.eventType === "impression") impressions.set(e.trackId, (impressions.get(e.trackId) ?? 0) + 1);
    if (e.eventType === "play_start") plays.set(e.trackId, (plays.get(e.trackId) ?? 0) + 1);
  }

  const dismissed = new Set<string>();
  for (const [trackId, count] of impressions) {
    if (count >= DISMISS_IMPRESSIONS && (plays.get(trackId) ?? 0) === 0 && !liked.has(trackId)) {
      dismissed.add(trackId);
    }
  }

  return { liked, negated, impressions, plays, dismissed };
}

async function buildRanked(userId: string, ctx: WallContext): Promise<WallEntry[]> {
  let items: Array<{ track: Track }> = [];
  try {
    const feed = await getRankedFeed(userId, RANKED_CAP, 0);
    items = feed.items;
  } catch {}
  const out: WallEntry[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const id = it.track.id;
    if (!id || seen.has(id) || ctx.negated.has(id)) continue;
    seen.add(id);
    out.push({ id, dto: it.track });
  }
  return out;
}

async function buildCatalog(
  userId: string,
  exclude: Set<string>,
  ctx: WallContext,
  rand: () => number
): Promise<WallEntry[]> {
  const rows = await db.track.findMany({
    where: exclude.size > 0 ? { id: { notIn: [...exclude] } } : undefined,
    include: { sources: true },
    orderBy: [{ popularity: "desc" }, { createdAt: "desc" }],
    take: CATALOG_CAP,
  });

  const never: WallEntry[] = [];
  const seen: WallEntry[] = [];
  const heard: WallEntry[] = [];

  for (const t of rows) {
    if (exclude.has(t.id) || ctx.dismissed.has(t.id) || ctx.negated.has(t.id)) continue;
    const plays = ctx.plays.get(t.id) ?? 0;
    const impressions = ctx.impressions.get(t.id) ?? 0;
    const entry: WallEntry = {
      id: t.id,
      dto: trackToDTO(t as unknown as Parameters<typeof trackToDTO>[0], { liked: ctx.liked.has(t.id) }),
    };
    if (plays > 0) heard.push(entry);
    else if (impressions > 0) seen.push(entry);
    else never.push(entry);
  }

  shuffleInPlace(never, rand);
  shuffleInPlace(seen, rand);
  shuffleInPlace(heard, rand);

  return [...never, ...seen, ...heard];
}

export function clearWallCache() {
  wallCache.clear();
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