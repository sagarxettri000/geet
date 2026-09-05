import type {
  Album,
  Artist,
  Genre,
  Playlist,
  Track,
} from "@prisma/client";
import { db } from "@/lib/db";

export function trackToDTO(
  track: Track & { sources?: Array<{ provider: string; providerVideoId: string; thumbnailUrl: string | null }> },
  opts?: { liked?: boolean }
) {
  const source = track.sources?.[0];
  const thumbnailUrl =
    track.thumbnailUrl ??
    source?.thumbnailUrl ??
    (source?.providerVideoId
      ? `https://i.ytimg.com/vi/${source.providerVideoId}/hqdefault.jpg`
      : null);

  return {
    id: track.id,
    title: track.title,
    artist: track.artistName,
    artistId: track.artistId ?? undefined,
    albumId: track.albumId ?? undefined,
    durationSec: track.durationSec,
    thumbnailUrl,
    thumbnailColor: track.thumbnailColor,
    popularity: track.popularity,
    genreId: track.genreId ?? undefined,
    sources: track.sources?.map((s) => ({
      provider: s.provider as "youtube",
      providerVideoId: s.providerVideoId,
    })) ?? [],
    isLiked: opts?.liked,
  };
}

export function artistToDTO(
  artist: Artist,
  opts?: { following?: boolean }
) {
  return {
    id: artist.id,
    name: artist.name,
    imageUrl: artist.imageUrl,
    thumbnailColor: artist.thumbnailColor,
    verified: artist.verified,
    bio: artist.bio,
    followers: artist.followers,
    monthlyListeners: artist.monthlyListeners,
    isFollowing: opts?.following,
  };
}

export function albumToDTO(album: Album & { _count?: { tracks: number } }) {
  return {
    id: album.id,
    title: album.title,
    artistId: album.artistId,
    artist: album.artistName,
    coverUrl: album.coverUrl,
    thumbnailColor: album.thumbnailColor,
    year: album.year,
    type: album.type as Album["type"],
    trackCount: album._count?.tracks ?? 0,
    durationSec: null as number | null,
  };
}

export function playlistToDTO(
  playlist: Playlist & { _count?: { tracks: number }; user?: { name: string | null; image: string | null } },
  opts?: { liked?: boolean }
) {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    isPublic: playlist.isPublic,
    coverUrl: playlist.coverUrl,
    thumbnailColor: playlist.thumbnailColor,
    trackCount: playlist._count?.tracks ?? 0,
    ownerId: playlist.userId,
    ownerName: playlist.user?.name ?? "GEET",
    ownerAvatarUrl: playlist.user?.image ?? null,
    createdAt: playlist.createdAt.toISOString(),
    updatedAt: playlist.updatedAt.toISOString(),
    isLiked: opts?.liked,
  };
}

export function genreToDTO(genre: Genre) {
  return {
    id: genre.id,
    name: genre.name,
    slug: genre.slug,
    imageUrl: genre.imageUrl,
    thumbnailColor: genre.thumbnailColor,
  };
}

/** Merged catalog search across tracks, artists, albums, playlists and genres. */
export async function searchCatalog(query: string, userId?: string) {
  const q = query.trim();
  if (!q) {
    return {
      tracks: [],
      artists: [],
      albums: [],
      playlists: [],
      genres: [],
    };
  }

  const [tracks, artists, albums, playlists, genres] = await Promise.all([
    db.track.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { artistName: { contains: q, mode: "insensitive" } },
          { genre: { OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ] } },
          { albumTracks: { some: { album: { title: { contains: q, mode: "insensitive" } } } } },
        ],
      },
      include: {
        sources: true,
        likedBy: userId ? { where: { userId }, take: 1 } : false,
      },
      orderBy: [{ popularity: "desc" }],
      take: 100,
    }),
    db.artist.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      orderBy: [{ monthlyListeners: "desc" }],
      take: 12,
    }),
    db.album.findMany({
      where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { artistName: { contains: q, mode: "insensitive" } }] },
      include: { _count: { select: { tracks: true } } },
      orderBy: [{ year: "desc" }],
      take: 12,
    }),
    db.playlist.findMany({
      where: {
        deletedAt: null,
        OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }],
        AND: [{ OR: [{ isPublic: true }, ...(userId ? [{ userId }] : [])] }],
      },
      include: { _count: { select: { tracks: true } }, user: { select: { name: true, image: true } } },
      orderBy: [{ updatedAt: "desc" }],
      take: 12,
    }),
    db.genre.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 12,
    }),
  ]);

  const followed = userId
    ? await db.followedArtist.findMany({
        where: { userId },
        select: { artistId: true },
      })
    : [];
  const followingSet = new Set(followed.map((f) => f.artistId));

  const albumCounts = await getAlbumTrackCounts();
  const playlistLikes = userId
    ? await db.likedPlaylist.findMany({ where: { userId }, select: { playlistId: true } })
    : [];
  const playlistLikeSet = new Set(playlistLikes.map((p) => p.playlistId));

  return {
    tracks: tracks.map((t) =>
      trackToDTO(t, { liked: (t.likedBy ?? []).length > 0 })
    ),
    artists: artists.map((a) => artistToDTO(a, { following: followingSet.has(a.id) })),
    albums: albums.map((a) => ({
      ...albumToDTO(a),
      trackCount: albumCounts.get(a.id) ?? 0,
    })),
    playlists: playlists.map((p) =>
      playlistToDTO(p, { liked: playlistLikeSet.has(p.id) })
    ),
    genres: genres.map(genreToDTO),
  };
}

async function getAlbumTrackCounts(): Promise<Map<string, number>> {
  const rows = await db.albumTrack.groupBy({
    by: ["albumId"],
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.albumId, r._count._all]));
}