import { db } from "@/lib/db";
import { trackToDTO } from "@/services/music";
import type { HomeSection } from "@/types/music";

export async function buildHomeFeed(userId: string) {
  const [hero, continueListening, recentlyPlayed, trending, madeForYou, releases, artists, albums, genres, mixes, likedTracksFeed, likes] =
    await Promise.all([
      loadHero(),
      loadContinueListening(userId),
      loadRecentlyPlayed(userId),
      loadTrending(userId),
      loadMadeForYou(userId),
      loadNewReleases(userId),
      loadTopArtists(userId),
      loadTopAlbums(),
      loadGenres(),
      loadMixes(userId),
      loadLikedTracks(userId),
      db.likedTrack.findMany({
        where: { userId },
        select: { trackId: true },
      }),
    ]);

  const likedSet = new Set(likes.map((l) => l.trackId));
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

  if (madeForYou.tracks.length > 0) {
    sections.push({
      key: "made-for-you",
      title: "Made for you",
      subtitle: `Because you like ${madeForYou.genre ?? "great music"}`,
      items: madeForYou.tracks,
    });
  }

  sections.push({
    key: "trending",
    title: "Trending now",
    subtitle: "The hottest tracks in GEET",
    items: trending,
  });

  sections.push({
    key: "mixes",
    title: "Today's mixes",
    subtitle: "Endless vibes, tuned for you",
    items: mixes,
  });

  sections.push({
    key: "new-releases",
    title: "New releases",
    subtitle: "Fresh drops, just added",
    items: releases,
  });

  if (likedTracksFeed.length >= 3) {
    sections.push({
      key: "liked",
      title: "Your liked songs",
      subtitle: "The songs you've loved the most",
      items: likedTracksFeed,
    });
  }

  sections.push({
    key: "artists",
    title: "Popular artists",
    subtitle: "Follow the ones you click with",
    items: artists,
  });

  sections.push({
    key: "albums",
    title: "Popular albums",
    subtitle: "Full-length favourites",
    items: albums,
  });

  sections.push({
    key: "genres",
    title: "Browse genres",
    subtitle: "Pick your flavour",
    items: genres,
  });

  return { hero, sections };
}

async function loadHero() {
  const featured = await db.featuredContent.findFirst({
    where: { active: true },
    include: {
      track: { include: { sources: true } },
      artist: true,
      album: true,
      playlist: true,
    },
    orderBy: { position: "asc" },
  });

  if (featured?.track) {
    return {
      type: "track" as const,
      title: featured.title ?? featured.track.title,
      description: featured.subtitle ?? `Play ${featured.track.title} by ${featured.track.artistName}`,
      track: trackToDTO(featured.track),
      elementId: featured.track.id,
      cta: "Play now",
    };
  }

  const featuredTrack = await db.track.findFirst({
    where: {},
    include: { sources: true },
    orderBy: { popularity: "desc" },
  });

  return {
    type: "track" as const,
    title: featuredTrack
      ? featuredTrack.title
      : "Where great music finds you",
    description: featuredTrack
      ? `By ${featuredTrack.artistName} · trending in GEET`
      : "Paste any YouTube link. Build a library that's truly yours.",
    track: featuredTrack ? trackToDTO(featuredTrack) : null,
    elementId: featuredTrack?.id ?? null,
    cta: "Play now",
  };
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

async function loadTrending(userId: string) {
  const tracks = await db.track.findMany({
    include: { sources: true },
    orderBy: [{ popularity: "desc" }],
    take: 20,
  });
  return attachLikes(tracks, userId);
}

async function loadMadeForYou(userId: string) {
  const listened = await db.listeningHistory.findMany({
    where: { userId },
    include: { track: { select: { genreId: true } } },
    orderBy: { playedAt: "desc" },
    take: 20,
  });
  const genreCount = new Map<string, number>();
  for (const row of listened) {
    if (row.track.genreId) {
      genreCount.set(row.track.genreId, (genreCount.get(row.track.genreId) ?? 0) + 1);
    }
  }
  const topGenreId = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  if (!topGenreId) return { tracks: [], genre: null };

  const tracks = await db.track.findMany({
    where: { genreId: topGenreId },
    include: { sources: true },
    orderBy: [{ popularity: "desc" }],
    take: 20,
  });
  const genre = await db.genre.findUnique({ where: { id: topGenreId } });
  const liked = await db.likedTrack.findMany({ where: { userId }, select: { trackId: true } });
  const likedSet = new Set(liked.map((l) => l.trackId));
  return {
    genre: genre?.name ?? "great music",
    tracks: tracks.map((t) => trackToDTO(t, { liked: likedSet.has(t.id) })),
  };
}

async function loadNewReleases(userId: string) {
  const tracks = await db.track.findMany({
    include: { sources: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return attachLikes(tracks, userId);
}

async function loadTopArtists(userId: string) {
  const artists = await db.artist.findMany({
    orderBy: [{ monthlyListeners: "desc" }, { followers: "desc" }],
    take: 12,
  });
  const following = await db.followedArtist.findMany({
    where: { userId },
    select: { artistId: true },
  });
  const set = new Set(following.map((f) => f.artistId));
  return artists.map((a) => ({
    id: a.id,
    name: a.name,
    imageUrl: a.imageUrl,
    thumbnailColor: a.thumbnailColor,
    verified: a.verified,
    bio: a.bio,
    followers: a.followers,
    monthlyListeners: a.monthlyListeners,
    isFollowing: set.has(a.id),
  }));
}

async function loadTopAlbums() {
  const albums = await db.album.findMany({
    include: { _count: { select: { tracks: true } } },
    orderBy: [{ tracks: { _count: "desc" } }],
    take: 16,
  });
  return albums.map((a) => ({
    id: a.id,
    title: a.title,
    artistId: a.artistId,
    artist: a.artistName,
    coverUrl: a.coverUrl,
    thumbnailColor: a.thumbnailColor,
    year: a.year,
    type: a.type,
    trackCount: a._count.tracks,
    durationSec: null,
  }));
}

async function loadGenres() {
  const genres = await db.genre.findMany({
    include: { _count: { select: { tracks: true } } },
  });
  return genres.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    imageUrl: g.imageUrl,
    thumbnailColor: g.thumbnailColor,
    trackCount: g._count.tracks,
  }));
}

async function loadMixes(userId: string) {
  const listened = await db.listeningHistory.findMany({
    where: { userId },
    include: { track: { select: { genreId: true } } },
    orderBy: { playedAt: "desc" },
    take: 30,
  });

  const genreCount = new Map<string, number>();
  for (const row of listened) {
    if (row.track.genreId) {
      genreCount.set(row.track.genreId, (genreCount.get(row.track.genreId) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => id);

  const resultGenres = topGenres.length > 0 ? topGenres : null;
  const mixSources = resultGenres
    ? resultGenres
    : (await db.genre.findMany({ take: 2, select: { id: true } })).map((g) => g.id);

  const colors = ["#FFB454", "#32CD7A", "#4C8BF5", "#F14C45"];

  const mixes = await Promise.all(
    mixSources.slice(0, 2).map(async (genreId, i) => {
      const genre = await db.genre.findUnique({ where: { id: genreId } });
      const tracks = await db.track.findMany({
        where: { genreId },
        include: { sources: true },
        orderBy: { popularity: "desc" },
        take: 12,
      });
      const liked = await db.likedTrack.findMany({ where: { userId }, select: { trackId: true } });
      const likedSet = new Set(liked.map((l) => l.trackId));
      return {
        title: `${genre?.name ?? "Daily"} Mix ${i + 1}`,
        subtitle: `${genre?.name ?? "Tuned"}: ${tracks.length} tracks · for ${userId.slice(0, 5)}`,
        color: colors[i % colors.length],
        tracks: tracks.map((t) => trackToDTO(t, { liked: likedSet.has(t.id) })),
      };
    })
  );
  return mixes;
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

async function attachLikes(
  tracks: Array<{ id: string; sources: unknown[] }>,
  userId: string
) {
  const liked = await db.likedTrack.findMany({
    where: { userId, trackId: { in: tracks.map((t) => t.id) } },
    select: { trackId: true },
  });
  const set = new Set(liked.map((l) => l.trackId));
  return tracks.map((t) => trackToDTO(t as any, { liked: set.has(t.id) }));
}