import { db } from "@/lib/db";
import { trackToDTO } from "@/services/music";
import { getRankedFeed } from "@/services/recommend";
import type { Track } from "@/types/music";

const RANKED_CAP = 500;
const CATALOG_CAP = 5000;
const WALL_TTL_MS = 60_000;

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

export async function getWallPage(userId: string, offset: number, limit = 48): Promise<WallPage> {
  const entries = await ensureWall(userId);
  const page = entries.slice(offset, offset + limit);
  return {
    items: page.map((e) => e.dto),
    nextOffset: offset + page.length,
    hasMore: offset + page.length < entries.length,
  };
}

async function ensureWall(userId: string): Promise<WallEntry[]> {
  const hit = wallCache.get(userId);
  if (hit && Date.now() - hit.at < WALL_TTL_MS) return hit.entries;

  const ranked = await buildRanked(userId);
  const exclude = new Set<string>();
  for (const e of ranked) exclude.add(e.id);
  const catalog = await buildCatalog(userId, exclude);

  const entries = [...ranked, ...catalog];
  wallCache.set(userId, { at: Date.now(), entries });
  return entries;
}

async function buildRanked(userId: string): Promise<WallEntry[]> {
  let items: Array<{ track: Track }> = [];
  try {
    const feed = await getRankedFeed(userId, RANKED_CAP, 0);
    items = feed.items;
  } catch {}
  const out: WallEntry[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const id = it.track.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, dto: it.track });
  }
  return out;
}

async function buildCatalog(userId: string, exclude: Set<string>): Promise<WallEntry[]> {
  const liked = new Set<string>();
  const likedRows = await db.likedTrack.findMany({ where: { userId }, select: { trackId: true } });
  for (const l of likedRows) liked.add(l.trackId);

  const rows = await db.track.findMany({
    where: exclude.size > 0 ? { id: { notIn: [...exclude] } } : undefined,
    include: { sources: true },
    orderBy: [{ popularity: "desc" }, { createdAt: "desc" }],
    take: CATALOG_CAP,
  });

  const entries: WallEntry[] = [];
  for (const t of rows) {
    if (exclude.has(t.id)) continue;
    entries.push({
      id: t.id,
      dto: trackToDTO(t as unknown as Parameters<typeof trackToDTO>[0], { liked: liked.has(t.id) }),
    });
  }
  return entries;
}

export function clearWallCache() {
  wallCache.clear();
}