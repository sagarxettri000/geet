import { db } from "@/lib/db";
import { TRENDING } from "@/services/recommend/weights";

const cache = new Map<"overall", { at: number; ids: string[] }>();

export async function getTrendingTrackIds(limit = 40): Promise<string[]> {
  const now = Date.now();
  const cached = cache.get("overall");
  if (cached && now - cached.at < TRENDING.cacheMs) return cached.ids.slice(0, limit);

  const ids = await computeTrending(limit * 2);

  const top = ids.slice(0, limit);
  cache.set("overall", { at: now, ids: top });
  return top;
}

async function computeTrending(limit: number): Promise<string[]> {
  const window = new Date(Date.now() - TRENDING.windowDays * 24 * 60 * 60 * 1000);
  const velocity = new Date(Date.now() - TRENDING.velocityHours * 60 * 60 * 1000);

  const watchingEvents = ["play", "play_start", "complete", "watch_progress"];

  const [total, recent] = await Promise.all([
    db.userEvent.groupBy({
      by: ["trackId"],
      where: {
        trackId: { not: null },
        eventType: { in: watchingEvents },
        createdAt: { gte: window },
      },
      _count: { _all: true },
      orderBy: { _count: { createdAt: "desc" } },
      take: 2000,
    }),
    db.userEvent.groupBy({
      by: ["trackId"],
      where: {
        trackId: { not: null },
        eventType: { in: watchingEvents },
        createdAt: { gte: velocity },
      },
      _count: { _all: true },
      orderBy: { _count: { createdAt: "desc" } },
      take: 2000,
    }),
  ]);

  const totalScored = total
    .filter((g) => g.trackId)
    .map((g) => ({ id: g.trackId!, count: g._count._all ?? 0 }));

  if (totalScored.length === 0) {
    const fallback = await db.track.findMany({
      select: { id: true },
      orderBy: [{ popularity: "desc" }],
      take: limit,
    });
    return fallback.map((t) => t.id);
  }

  const velocityCounts = new Map<string, number>();
  for (const g of recent) if (g.trackId) velocityCounts.set(g.trackId, g._count._all ?? 0);

  const scored = totalScored
    .map((x) => ({
      id: x.id,
      score: x.count + (velocityCounts.get(x.id) ?? 0) * TRENDING.velocityWeight,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => s.id);
}

export function clearTrendingCache() {
  cache.clear();
}