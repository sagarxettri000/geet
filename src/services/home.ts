import { db } from "@/lib/db";
import { trackToDTO } from "@/services/music";
import { trendingYouTubeMusic } from "@/lib/youtube/data-api";
import type { HomeSection } from "@/types/music";

export async function buildHomeFeed(userId: string) {
  const [continueListening, recentlyPlayed, youtubeTrending, releases, genres, likedTracksFeed, recommendations] =
    await Promise.all([
      loadContinueListening(userId),
      loadRecentlyPlayed(userId),
      loadYouTubeTrending(),
      loadNewReleases(userId),
      loadGenres(userId),
      loadLikedTracks(userId),
      loadRecommendations(userId),
    ]);

  const sections: HomeSection<unknown>[] = [];

  if (continueListening.length > 0) {
    sections.push({
      key: "continue-listening",
      title: "Play it again",
      subtitle: "Where you left off",
      items: continueListening,
    });
  }

  sections.push({
    key: "recently-played",
    title: "Recently played",
    subtitle: "Tap to jump back in",
    items: recentlyPlayed,
  });

  // YouTube-style rows: based on who/what you actually listen to.
  for (const rec of recommendations) {
    sections.push({
      key: rec.key,
      title: rec.title,
      subtitle: rec.subtitle,
      items: rec.items,
    });
  }

  if (youtubeTrending.length > 0) {
    const market = (process.env.YOUTUBE_REGION ?? "IN").toUpperCase();
    sections.push({
      key: "youtube-trending",
      title: "Trending on YouTube",
      subtitle: `The real YouTube music hit list · ${market}`,
      items: youtubeTrending,
    });
  }

  sections.push({
    key: "new-releases",
    title: "New releases",
    subtitle: "Fresh drops, just added",
    items: releases,
  });

  if (likedTracksFeed.length > 0) {
    sections.push({
      key: "liked",
      title: "Your liked songs",
      subtitle: "The songs you've loved the most",
      items: likedTracksFeed,
    });
  }

  sections.push({
    key: "genres",
    title: "Browse genres",
    subtitle: "Pick your flavour",
    items: genres,
  });

  return { sections };
}

async function loadYouTubeTrending() {
  const region = (process.env.YOUTUBE_REGION ?? "IN").toUpperCase().slice(0, 2);
  try {
    const hits = await trendingYouTubeMusic(region, 14);
    return hits as unknown[];
  } catch {
    return [];
  }
}

async function loadContinueListening(userId: string) {
  const rows = await db.listeningHistory.findMany({
    where: {
      userId,
      progressSec: { gt: 0 },
      completion: { lt: 100 },
    },
    include: {
      track: { include: { sources: true } },
    },
    orderBy: { playedAt: "desc" },
    take: 12,
  });

  return rows.map((row) => ({
    id: row.id,
    track: trackToDTO(row.track),
    playedAt: row.playedAt.toISOString(),
    progressSec: row.progressSec,
    durationSec: row.track.durationSec,
    completion: row.completion,
  }));
}

async function loadRecentlyPlayed(userId: string) {
  const rows = await db.recentlyPlayed.findMany({
    where: { userId },
    include: { track: { include: { sources: true } } },
    orderBy: { playedAt: "desc" },
    take: 16,
  });
  return rows.map((row) => ({
    id: row.id,
    track: trackToDTO(row.track),
    playedAt: row.playedAt.toISOString(),
  }));
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
  if (history.length === 0) return [];

  const listened = new Set(history.map((h) => h.track.id));
  const artistCounts = new Map<string, { count: number; id: string | null; name: string }>();
  const genreCounts = new Map<string, number>();

  for (const h of history) {
    const t = h.track;
    if (t.artistId || t.artistName) {
      const key = t.artistId ?? `name:${t.artistName}`;
      const cur = artistCounts.get(key);
      artistCounts.set(key, {
        count: (cur?.count ?? 0) + 1,
        id: t.artistId,
        name: t.artistName,
      });
    }
    if (t.genreId) genreCounts.set(t.genreId, (genreCounts.get(t.genreId) ?? 0) + 1);
  }

  const genreNames =
    genreCounts.size > 0
      ? await db.genre.findMany({ where: { id: { in: [...genreCounts.keys()] } } })
      : [];
  const genreNameMap = new Map(genreNames.map((g) => [g.id, g.name]));

  const liked = await db.likedTrack.findMany({ where: { userId }, select: { trackId: true } });
  const likedSet = new Set(liked.map((l) => l.trackId));

  // "Because you listened to {artist}" — lead artist rotates so the home row
  // stays fresh between visits, like YouTube's rec row.
  const topArtists = [...artistCounts.values()].sort((a, b) => b.count - a.count);
  const offset = topArtists.length > 1 ? Math.floor(Math.random() * Math.min(topArtists.length, 3)) : 0;
  const rotated = [...topArtists.slice(offset), ...topArtists.slice(0, offset)];

  const rows: RecommendationRow[] = [];
  for (const artist of rotated.slice(0, 3)) {
    if (rows.length >= 4) break;
    const where = artist.id ? { artistId: artist.id } : { artistName: artist.name };
    const all = await db.track.findMany({
      where,
      include: { sources: true },
      orderBy: [{ popularity: "desc" }],
      take: 20,
    });
    const pools = pickForRow(all, listened);
    if (pools.length === 0) continue;
    rows.push({
      key: `because-artist-${artist.id ?? artist.name}`,
      title: `More from ${artist.name}`,
      subtitle: `Because you've been listening to ${artist.name}`,
      items: pools.map((t) => trackToDTO(t, { liked: likedSet.has(t.id) })),
    });
  }

  // Genre rows — "More {genre}" from what you actually play.
  const sortedGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [genreId] of sortedGenres) {
    if (rows.length >= 4) break;
    const name = genreNameMap.get(genreId);
    if (!name) continue;
    const all = await db.track.findMany({
      where: { genreId },
      include: { sources: true },
      orderBy: [{ popularity: "desc" }],
      take: 20,
    });
    const pools = pickForRow(all, listened);
    if (pools.length === 0) continue;
    rows.push({
      key: `because-genre-${genreId}`,
      title: `More ${name}`,
      subtitle: `Based on your ${name} listening`,
      items: pools.map((t) => trackToDTO(t, { liked: likedSet.has(t.id) })),
    });
  }

  return rows.slice(0, 4);
}

// Whole tracks you haven't played yet first, then the already-heard ones —
// exactly how YouTube fronts up unseen videos from a creator you like.
function pickForRow<T extends { id: string }>(all: T[], listened: Set<string>): T[] {
  const unseen = all.filter((t) => !listened.has(t.id));
  const heard = all.filter((t) => listened.has(t.id));
  return [...unseen, ...heard].slice(0, 12);
}

async function loadNewReleases(userId: string) {
  const tracks = await db.track.findMany({
    include: { sources: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const liked = await db.likedTrack.findMany({
    where: { userId, trackId: { in: tracks.map((t) => t.id) } },
    select: { trackId: true },
  });
  const set = new Set(liked.map((l) => l.trackId));
  return tracks.map((t) => trackToDTO(t, { liked: set.has(t.id) }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadGenres(userId: string) {
  const genres = await db.genre.findMany({
    include: { _count: { select: { tracks: true } } },
  });
  // Shuffle every load so the "suggested genres" feel fresh on each visit.
  return shuffle(genres).map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    imageUrl: g.imageUrl,
    thumbnailColor: g.thumbnailColor,
    trackCount: g._count.tracks,
  }));
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