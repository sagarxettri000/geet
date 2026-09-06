import { db } from "@/lib/db";
import { trackToDTO } from "@/services/music";
import type { HomeSection } from "@/types/music";

export async function buildHomeFeed(userId: string) {
  const [recommendations, likedTracksFeed] = await Promise.all([
    loadRecommendations(userId),
    loadLikedTracks(userId),
  ]);

  const sections: HomeSection<unknown>[] = [];

  // YouTube-style feed: rows that keep suggesting new songs to play next.
  for (const rec of recommendations) {
    sections.push({
      key: rec.key,
      title: rec.title,
      subtitle: rec.subtitle,
      items: rec.items,
    });
  }

  // Your liked songs are always shown at the very end of the feed.
  if (likedTracksFeed.length > 0) {
    sections.push({
      key: "liked",
      title: "Your liked songs",
      subtitle: "The songs you've loved the most",
      items: likedTracksFeed,
    });
  }

  return { sections };
}

interface RecommendationRow {
  key: string;
  title: string;
  subtitle: string;
  items: unknown[];
}

async function loadRecommendations(userId: string): Promise<RecommendationRow[]> {
  const history = await db.listeningHistory.findMany({
    where: { userId },
    include: {
      track: { select: { id: true, artistId: true, artistName: true, genreId: true } },
    },
    orderBy: { playedAt: "desc" },
    take: 100,
  });
  if (history.length === 0) {
    // No listening history yet — serve a generic "popular right now" feed so
    // the home page still behaves like YouTube and never feels empty.
    const popular = await db.track.findMany({
      include: { sources: true },
      orderBy: [{ popularity: "desc" }],
      take: 60,
    });
    const groups = new Map<string, typeof popular>();
    for (const t of popular) {
      const key = t.artistId ?? t.artistName;
      if (groups.size >= 8) break;
      if (!groups.has(key)) groups.set(key, []);
      if (groups.get(key)!.length < 4) groups.get(key)!.push(t);
    }
    return shuffle([...groups.values()]).map((group, i) => ({
      key: `popular-${i}`,
      title: "Popular right now",
      subtitle: `Top picks from ${group[0]?.artistName ?? "GEET"}`,
      items: group.map((t) => trackToDTO(t, { liked: false })),
    }));
  }

  const listened = new Set(history.map((h) => h.track.id));

  // Anything you've ever played is off-limits for suggestions — heard forever.
  const heardRows = await db.listeningHistory.findMany({
    where: { userId },
    select: { trackId: true },
    orderBy: { playedAt: "desc" },
    take: 1000,
  });
  for (const h of heardRows) listened.add(h.trackId);
  const listenedArtists = new Set<string>();
  const listenedGenres = new Set<string>();
  const artistCounts = new Map<string, { count: number; id: string | null; name: string }>();
  const genreCounts = new Map<string, number>();

  for (const h of history) {
    const t = h.track;
    if (t.artistId || t.artistName) {
      const key = t.artistId ?? `name:${t.artistName}`;
      if (t.artistId) listenedArtists.add(t.artistId);
      const cur = artistCounts.get(key);
      artistCounts.set(key, {
        count: (cur?.count ?? 0) + 1,
        id: t.artistId,
        name: t.artistName,
      });
    }
    if (t.genreId) {
      listenedGenres.add(t.genreId);
      genreCounts.set(t.genreId, (genreCounts.get(t.genreId) ?? 0) + 1);
    }
  }

  const genreNames =
    genreCounts.size > 0
      ? await db.genre.findMany({ where: { id: { in: [...genreCounts.keys()] } } })
      : [];
  const genreNameMap = new Map(genreNames.map((g) => [g.id, g.name]));

  const liked = await db.likedTrack.findMany({ where: { userId }, select: { trackId: true } });
  const likedSet = new Set(liked.map((l) => l.trackId));

  // ---- YouTube-style ranking context ---------------------------------
  // Predict what you'd keep listening to from a blend of: how often you play
  // the artist and genre (affinity), the track's popularity, how recently it
  // was added (freshness), plus a jitter term so the same feed never shows
  // up twice in a row.
  const artistAff = new Map<string, number>();
  for (const [key, v] of artistCounts) artistAff.set(key, v.count);
  const genreAff = new Map<string, number>();
  for (const [genreId, count] of genreCounts) genreAff.set(genreId, count);

  // A track added in the last two weeks counts as "fresh" (like a new upload),
  // and gets an extra boost the way YouTube surges fresh videos.
  const freshCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;

  // Once a track is placed in a row it is removed from every later pool:
  // YouTube never shows the same video twice on one home page.
  const picked = new Set<string>();

  const ctx = { artistAff, genreAff, freshCutoff, jitter: 6 };

  // Every visit pulls a fresh hand of top artists and genres.
  const topArtists = shuffle(
    [...artistCounts.values()].sort((a, b) => b.count - a.count).slice(0, 12)
  );

  const rows: RecommendationRow[] = [];

  // Rows 1–5: what you already like, fronted with the strongest matches.
  for (const artist of topArtists) {
    if (rows.length >= 5) break;
    const where = artist.id ? { artistId: artist.id } : { artistName: artist.name };
    const byArtist = await db.track.findMany({
      where,
      include: { sources: true },
      orderBy: [{ popularity: "desc" }],
      take: 40,
    });

    const mains = byArtist.filter((t) => !listened.has(t.id));

    // Top up the row with related, never-heard tracks from the same genre —
    // YouTube's "related video" widening, so a refresh serves new music.
    const artistGenre = byArtist[0]?.genreId ?? null;
    let related: typeof byArtist = [];
    if (artistGenre && mains.length < 6) {
      const relatedWhere: Record<string, unknown> = {
        genreId: artistGenre,
        id: { notIn: [...listened] },
      };
      if (artist.id) relatedWhere.NOT = { artistId: artist.id };
      else relatedWhere.NOT = { artistName: artist.name };
      related = await db.track.findMany({
        where: relatedWhere,
        include: { sources: true },
        orderBy: [{ popularity: "desc" }],
        take: 30,
      });
    }

    const rankedMains = rankTracks(mains.filter((t) => !picked.has(t.id)), ctx, 6);
    for (const t of rankedMains) picked.add(t.id);
    const rankedRelated = rankTracks(
      related.filter((t) => !picked.has(t.id)),
      ctx,
      12 - rankedMains.length
    );
    for (const t of rankedRelated) picked.add(t.id);

    const pools = [...rankedMains, ...rankedRelated];
    if (pools.length === 0) continue;
    rows.push({
      key: `because-artist-${artist.id ?? artist.name}`,
      title: `More from ${artist.name}`,
      subtitle: `Because you've been listening to ${artist.name}`,
      items: pools.map((t) => trackToDTO(t, { liked: likedSet.has(t.id) })),
    });
  }

  // Genre rows — "More {genre}", scored and never duplicating earlier rows.
  for (const [genreId] of shuffle([...genreCounts.entries()])) {
    if (rows.length >= 8) break;
    const name = genreNameMap.get(genreId);
    if (!name) continue;
    const all = await db.track.findMany({
      where: { genreId, id: { notIn: [...listened, ...picked] } },
      include: { sources: true },
      orderBy: [{ popularity: "desc" }],
      take: 60,
    });
    const pools = rankTracks(all, ctx, 10);
    if (pools.length === 0) continue;
    for (const t of pools) picked.add(t.id);
    rows.push({
      key: `because-genre-${genreId}`,
      title: `More ${name}`,
      subtitle: `Based on your ${name} listening`,
      items: pools.map((t) => trackToDTO(t, { liked: likedSet.has(t.id) })),
    });
  }

  // Guaranteed exploration slice — YouTube always devotes part of the page to
  // things you've never touched, even when predicted interest is lower. This is
  // the mechanism that stops the feed from looping on your favourites.
  const freshArtists = await db.artist.findMany({
    where: listenedArtists.size ? { id: { notIn: [...listenedArtists] } } : undefined,
    orderBy: { monthlyListeners: "desc" },
    take: 24,
  });
  for (const artist of shuffle(freshArtists)) {
    if (rows.length >= 9) break;
    const all = await db.track.findMany({
      where: { artistId: artist.id, id: { notIn: [...listened, ...picked] } },
      include: { sources: true },
      orderBy: [{ popularity: "desc" }],
      take: 24,
    });
    const pools = rankTracks(all.filter((t) => t.sources.length > 0), ctx, 10);
    if (pools.length === 0) continue;
    for (const t of pools) picked.add(t.id);
    rows.push({
      key: `discover-artist-${artist.id}`,
      title: `Discover ${artist.name}`,
      subtitle: "New to your ears",
      items: pools.map((t) => trackToDTO(t, { liked: likedSet.has(t.id) })),
    });
  }

  return rows.slice(0, 9);
}

interface ScoreContext {
  artistAff: Map<string, number>;
  genreAff: Map<string, number>;
  freshCutoff: number;
  jitter: number;
}

interface ScorableTrack {
  id: string;
  artistId: string | null;
  artistName: string;
  genreId: string | null;
  popularity: number;
  createdAt: Date;
}

// Rank candidates the way YouTube's candidate reranker does — a weighted blend
// of affinity, popularity and freshness. The jitter term is the stand-in for
// session-level personalization: it shifts scores a little every load.
function scoreTrack(t: ScorableTrack, ctx: ScoreContext): number {
  let score = 0;
  const artistKey = t.artistId ?? `name:${t.artistName}`;
  score += 10 * (ctx.artistAff.get(artistKey) ?? 0);
  if (t.genreId) score += 4 * (ctx.genreAff.get(t.genreId) ?? 0);
  score += 3 * (t.popularity / 100);
  if (t.createdAt.getTime() >= ctx.freshCutoff) score += 8;
  score += ctx.jitter * Math.random();
  return score;
}

function rankTracks<T extends ScorableTrack>(
  tracks: T[],
  ctx: ScoreContext,
  count: number
): T[] {
  return [...tracks].sort((a, b) => scoreTrack(b, ctx) - scoreTrack(a, ctx)).slice(0, count);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadLikedTracks(userId: string) {
  const rows = await db.likedTrack.findMany({
    where: { userId },
    include: { track: { include: { sources: true } } },
    orderBy: { likedAt: "desc" },
    take: 20,
  });
  return rows.map((r) => trackToDTO(r.track, { liked: true }));
}