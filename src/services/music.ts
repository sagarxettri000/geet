import type {
  Album,
  Artist,
  Genre,
  Playlist,
  Track,
} from "@prisma/client";
import { db } from "@/lib/db";
import { fetchOEmbed, OEmbedError } from "@/lib/youtube/oembed";
import { artistForName, getOrCreateTrackFromVideo } from "@/services/catalog";

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

/** Resolve a YouTube video into a persisted track DTO (upserts if needed). */
export async function intakeTrackFromYoutube(
  videoId: string
): Promise<{ track: ReturnType<typeof trackToDTO>; created: boolean }> {
  let meta;
  try {
    meta = await fetchOEmbed(videoId);
  } catch (err) {
    const kind =
      err instanceof OEmbedError ? err.kind : "network";
    return Promise.reject(
      new Error(
        kind === "not-found"
          ? "This video isn't available."
          : "Couldn't load that video's details. Check the link and try again."
      )
    );
  }

  const { track, created } = await getOrCreateTrackFromVideo({
    videoId,
    title: meta.title,
    artist: meta.authorName,
    thumbnailUrl: meta.thumbnailUrl,
    durationSec: null,
  });
  return { track: trackToDTO(track), created };
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
          { title: { contains: q } },
          { artistName: { contains: q } },
        ],
      },
      include: {
        sources: true,
        likedBy: userId ? { where: { userId }, take: 1 } : false,
      },
      orderBy: [{ popularity: "desc" }],
      take: 20,
    }),
    db.artist.findMany({
      where: { name: { contains: q } },
      orderBy: [{ monthlyListeners: "desc" }],
      take: 8,
    }),
    db.album.findMany({
      where: { OR: [{ title: { contains: q } }, { artistName: { contains: q } }] },
      include: { _count: { select: { tracks: true } } },
      orderBy: [{ year: "desc" }],
      take: 8,
    }),
    db.playlist.findMany({
      where: {
        deletedAt: null,
        OR: [{ name: { contains: q } }, { description: { contains: q } }],
      },
      include: { _count: { select: { tracks: true } }, user: { select: { name: true, image: true } } },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
    }),
    db.genre.findMany({
      where: { name: { contains: q } },
      take: 5,
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

export function slugForSectionHeader(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function getAlbumTrackCounts(): Promise<Map<string, number>> {
  const rows = await db.albumTrack.groupBy({
    by: ["albumId"],
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.albumId, r._count._all]));
}

/** Attach like/follow state to DTOs for the current user. */
export async function withUserState(
  tracks: ReturnType<typeof trackToDTO>[],
  artists: ReturnType<typeof artistToDTO>[],
  userId: string
) {
  const [liked, followed] = await Promise.all([
    db.likedTrack.findMany({
      where: { userId, trackId: { in: tracks.map((t) => t.id).filter(Boolean) as string[] } },
    }),
    db.followedArtist.findMany({
      where: { userId, artistId: { in: artists.map((a) => a.id) } },
    }),
  ]);
  const likedSet = new Set(liked.map((l) => l.trackId));
  const followedSet = new Set(followed.map((f) => f.artistId));
  return {
    tracks: tracks.map((t) => ({ ...t, isLiked: t.id ? likedSet.has(t.id) : false })),
    artists: artists.map((a) => ({ ...a, isFollowing: a ? followedSet.has(a.id) : false })),
  };
}