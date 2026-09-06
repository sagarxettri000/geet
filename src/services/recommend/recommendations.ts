import { db } from "@/lib/db";
import { trackToDTO } from "@/services/music";
import { generateCandidates } from "@/services/recommend/candidates";
import { getHeardTrackIds, getProfile, getRecentIntent, persistProfile } from "@/services/recommend/profile";
import { scoreCandidate } from "@/services/recommend/rank";
import { composeRows, rowsToFeed, type RowNames } from "@/services/recommend/rerank";
import { getTrendingTrackIds } from "@/services/recommend/trending";
import { EXPLORATION } from "@/services/recommend/weights";
import { artistKeyOf, type Candidate, type FeedRow, type RecommendationFeed } from "@/services/recommend/types";

const COLD_START_SIGNALS = 5;
const COLD_START_CACHE_MS = 5 * 60 * 1000;

let coldCache = new Map<string, { at: number; feed: RecommendationFeed }>();

export interface FeedOptions {
  sessionId?: string;
  includeLikedAtEnd?: boolean;
}

export async function buildRecommendationFeed(userId: string, opts: FeedOptions = {}): Promise<RecommendationFeed> {
  const profile = await getProfile(userId);
  const likedIds = await loadLikedSet(userId);

  if (profile.signalCount < COLD_START_SIGNALS) {
    const feed = await buildColdStartFeed(userId, likedIds);
    persistProfile(userId, profile);
    return feed;
  }

  const heard = await getHeardTrackIds(userId);
  const intent = await getRecentIntent(userId);

  const picked = new Set<string>();
  const candidates = await generateCandidates({ userId, profile, heard, picked, intent });
  const trendingIds = new Set(await getTrendingTrackIds(60));

  const rankCtx = { profile, intent, picked, trending: trendingIds };
  const scored = candidates
    .map((c) => ({ c, s: scoreCandidate(c, rankCtx) }))
    .sort((a, b) => b.s - a.s);

  const names = await loadRowNames(candidates);
  const groups = composeRows(
    scored.map((x) => ({ ...x.c, score: x.s })),
    names
  );

  const sections = rowsToFeed(groups, (c) => ({
    ...(trackToDTO(c.track as unknown as Parameters<typeof trackToDTO>[0], { liked: likedIds.has(c.track.id) })),
    reason: c.reason,
  }));

  let output = sections;
  if (opts.includeLikedAtEnd) {
    const likeRow = await loadLikedRow(userId);
    if (likeRow) output = [...sections.filter((s) => s.key !== "liked"), likeRow];
  }

  void logImpressions(userId, opts.sessionId, sections);
  void persistProfile(userId, profile);

  return { sections: output, composedAt: new Date().toISOString() };
}

export async function getRankedFeed(userId: string, limit: number, offset: number) {
  const profile = await getProfile(userId);
  const heard = await getHeardTrackIds(userId);
  const intent = await getRecentIntent(userId);
  const picked = new Set<string>();

  let candidates: Candidate[] = [];
  if (profile.signalCount < COLD_START_SIGNALS) {
    const lite = await coldStartCandidates(60);
    candidates = lite.slice(offset, offset + limit);
  } else {
    const all = await generateCandidates({ userId, profile, heard, picked, intent });
    const trendingIds = new Set(await getTrendingTrackIds(60));
    const rankCtx = { profile, intent, picked, trending: trendingIds };
    const scored = all
      .map((c) => ({ c, s: scoreCandidate(c, rankCtx) }))
      .sort((a, b) => b.s - a.s);
    candidates = scored.slice(offset, offset + limit).map((x) => ({ ...x.c, score: x.s }));
  }

  const likedIds = await loadLikedSet(userId);
  const items = candidates.map((c) => ({
    track: trackToDTO(c.track as unknown as Parameters<typeof trackToDTO>[0], { liked: likedIds.has(c.track.id) }),
    score: +(c.score ?? 0).toFixed(3),
    reason: c.reason,
    source: c.source,
  }));

  return { items, nextCursor: offset + items.length, composedAt: new Date().toISOString() };
}

async function loadLikedSet(userId: string) {
  const liked = await db.likedTrack.findMany({ where: { userId }, select: { trackId: true } });
  return new Set(liked.map((l) => l.trackId));
}

async function loadLikedRow(userId: string): Promise<FeedRow | null> {
  const rows = await db.likedTrack.findMany({
    where: { userId },
    include: { track: { include: { sources: true } } },
    orderBy: { likedAt: "desc" },
    take: 20,
  });
  if (rows.length === 0) return null;
  return {
    key: "liked",
    title: "Your liked songs",
    subtitle: "The songs you've loved the most",
    reason: "liked",
    rowType: "user_interest",
    items: rows.map((r) => trackToDTO(r.track, { liked: true })),
  };
}

async function loadRowNames(candidates: Candidate[]): Promise<RowNames> {
  const artistKeys = new Set(candidates.map((c) => c.artistKey));
  const artistIds = [...artistKeys].filter((k) => k.startsWith("id:")).map((k) => k.slice(3));
  const artistNames = new Map<string, string>();
  for (const k of artistKeys) if (k.startsWith("name:")) artistNames.set(k, k.slice(5));
  if (artistIds.length > 0) {
    const rows = await db.artist.findMany({ where: { id: { in: artistIds } }, select: { id: true, name: true } });
    for (const r of rows) artistNames.set(`id:${r.id}`, r.name);
  }
  const genreIds = [...new Set(candidates.map((c) => c.track.genreId).filter((g) => !!g) as string[])];
  const genreNames = new Map<string, string>();
  if (genreIds.length > 0) {
    const rows = await db.genre.findMany({ where: { id: { in: genreIds } }, select: { id: true, name: true } });
    for (const r of rows) genreNames.set(r.id, r.name);
  }
  return {
    artistOf: (key) => artistNames.get(key) ?? key.split(":").pop() ?? "artists",
    genreOf: (id) => genreNames.get(id) ?? "music",
  };
}

async function logImpressions(userId: string, sessionId: string | undefined, sections: FeedRow[]) {
  const flat: Array<{ userId: string; sessionId: string; trackId: string; position: number; section: string; reason: string }> = [];
  for (const section of sections) {
    section.items.forEach((item, i) => {
      const trackId = (item as { id?: string }).id;
      if (!trackId) return;
      flat.push({
        userId,
        sessionId: sessionId ?? "",
        trackId,
        position: i,
        section: section.key.length > 80 ? section.key.slice(0, 80) : section.key,
        reason: section.reason.length > 120 ? section.reason.slice(0, 120) : section.reason,
      });
    });
  }
  if (flat.length === 0) return;
  try {
    await db.recommendationImpression.createMany({
      data: flat,
      skipDuplicates: true,
    });
  } catch {}
}

export function clearColdCache() {
  coldCache.clear();
}

export function clearRecommendationCaches() {
  clearColdCache();
  coldCache = new Map();
}

async function buildColdStartFeed(userId: string, likedIds: Set<string>): Promise<RecommendationFeed> {
  const cached = coldCache.get("all");
  if (cached && Date.now() - cached.at < COLD_START_CACHE_MS) return cached.feed;

  const [popular, trendingIds, fresh] = await Promise.all([
    db.track.findMany({ include: { sources: true }, orderBy: [{ popularity: "desc" }], take: 60 }),
    getTrendingTrackIds(20),
    db.track.findMany({ include: { sources: true }, orderBy: [{ createdAt: "desc" }], take: 20 }),
  ]);

  const toItem = (t: (typeof popular)[number]) =>
    trackToDTO(t as unknown as Parameters<typeof trackToDTO>[0], { liked: likedIds.has(t.id) });

  const groups = new Map<string, typeof popular>();
  for (const t of popular) {
    const key = t.artistId ?? t.artistName;
    if (groups.size >= 8) break;
    if (!groups.has(key)) groups.set(key, []);
    if (groups.get(key)!.length < 4) groups.get(key)!.push(t);
  }

  const sections: FeedRow[] = shuffle([...groups.values()]).map((group, i) => ({
    key: `popular-${i}`,
    title: "Popular right now",
    subtitle: `Top picks from ${group[0]?.artistName ?? "GEET"}`,
    reason: "popular",
    rowType: "trending",
    items: group.map(toItem),
  }));

  if (trendingIds.length > 0) {
    const trendingTracks = await db.track.findMany({ where: { id: { in: trendingIds } }, include: { sources: true } });
    if (trendingTracks.length > 0) {
      sections.push({
        key: "trending-now",
        title: "Trending now",
        subtitle: "What's moving across GEET",
        reason: "new_for_you",
        rowType: "trending",
        items: trendingTracks.slice(0, EXPLORATION.rowSize).map(toItem),
      });
    }
  }

  if (fresh.length > 0) {
    sections.push({
      key: "fresh-finds",
      title: "Fresh finds",
      subtitle: "Recently added to GEET",
      reason: "new_for_you",
      rowType: "fresh",
      items: fresh.slice(0, EXPLORATION.rowSize).map(toItem),
    });
  }

  const exploreArtists = await db.artist.findMany({ orderBy: { monthlyListeners: "desc" }, take: 8 });
  for (const artist of exploreArtists) {
    if (sections.length >= EXPLORATION.maxRows) break;
    const tracks = await db.track.findMany({
      where: { artistId: artist.id },
      include: { sources: true },
      orderBy: [{ popularity: "desc" }],
      take: EXPLORATION.rowSize,
    });
    if (tracks.length === 0) continue;
    sections.push({
      key: `new-to-you-${artist.id}`,
      title: "New to you",
      subtitle: "Fresh picks we think you'll like",
      reason: "exploration",
      rowType: "exploration",
      items: tracks.map(toItem),
    });
  }

  const feed = { sections: sections.slice(0, EXPLORATION.maxRows), composedAt: new Date().toISOString() };
  coldCache.set("all", { at: Date.now(), feed });
  return feed;
}

async function coldStartCandidates(limit: number): Promise<Candidate[]> {
  const feed = await buildColdStartFeed("cold", new Set());
  const out: Candidate[] = [];
  for (const s of feed.sections) {
    const dtos = s.items as ReturnType<typeof trackToDTO>[];
    for (const dto of dtos) {
      if (!dto.id) continue;
      out.push({
        track: {
          id: dto.id,
          title: dto.title,
          artistName: dto.artist,
          artistId: dto.artistId ?? null,
          genreId: dto.genreId ?? null,
          popularity: dto.popularity ?? 50,
          createdAt: new Date(),
          durationSec: dto.durationSec,
          thumbnailUrl: dto.thumbnailUrl,
          thumbnailColor: dto.thumbnailColor ?? null,
          albumId: dto.albumId ?? null,
          sources: (dto.sources ?? []).map((x) => ({
            id: x.providerVideoId,
            provider: x.provider,
            providerVideoId: x.providerVideoId,
            thumbnailUrl: null,
          })),
        },
        source: s.rowType === "exploration" ? "exploration" : "trending",
        reason: s.reason,
        artistKey: artistKeyOf(dto.artistId ?? null, dto.artist),
      });
    }
  }
  return out.slice(0, limit);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}