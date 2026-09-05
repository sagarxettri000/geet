import { db } from "@/lib/db";
import { trackToDTO } from "@/services/music";

/**
 * Lightweight, explainable recommendations built from listening history:
 * boosts tracks from historically strong genres/artists that the user has
 * NOT played yet. Used for "Made for you" style sections.
 */
export async function recommendationsFor(
  userId: string,
  limit = 20
): Promise<
  Array<{ id: string; title: string; artist: string; genre: string | null }>
> {
  const history = await db.listeningHistory.findMany({
    where: { userId },
    include: {
      track: {
        select: {
          id: true,
          title: true,
          artistName: true,
          artistId: true,
          genreId: true,
          genre: { select: { name: true } },
        },
      },
    },
    orderBy: { playedAt: "desc" },
    take: 100,
  });

  if (history.length === 0) return [];

  const genreScores = new Map<string, number>();
  const artistScores = new Map<string, number>();
  const played = new Set<string>();

  for (const row of history) {
    played.add(row.track.id);
    if (row.track.genreId) {
      genreScores.set(
        row.track.genreId,
        (genreScores.get(row.track.genreId) ?? 0) + 1
      );
    }
    if (row.track.artistId) {
      artistScores.set(
        row.track.artistId,
        (artistScores.get(row.track.artistId) ?? 0) + 1
      );
    }
  }

  const candidates = await db.track.findMany({
    where: { id: { notIn: [...played] } },
    include: { genre: true },
    take: 500,
  });

  const scored = candidates
    .map((track) => {
      const genreScore = track.genreId ? genreScores.get(track.genreId) ?? 0 : 0;
      const artistScore = track.artistId
        ? (artistScores.get(track.artistId) ?? 0) * 2.0
        : 0;
      const score = genreScore + artistScore + Math.log1p(track.popularity ?? 0);
      return { track, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ track }) => ({
    id: track.id,
    title: track.title,
    artist: track.artistName,
    genre: track.genre?.name ?? null,
  }));
}

/** Translate recommendation seeds into full player-ready DTOs. */
export async function recommendTracks(
  userId: string,
  limit = 20
): Promise<ReturnType<typeof trackToDTO>[]> {
  const recs = await recommendationsFor(userId, limit);
  const ids = recs.map((r) => r.id);
  if (ids.length === 0) return [];

  const liked = await db.likedTrack.findMany({
    where: { userId, trackId: { in: ids } },
    select: { trackId: true },
  });
  const likedSet = new Set(liked.map((l) => l.trackId));

  const tracks = await db.track.findMany({
    where: { id: { in: ids } },
    include: { sources: true },
  });
  const byId = new Map(tracks.map((t) => [t.id, t]));
  return ids
    .map((id) => byId.get(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => trackToDTO(t, { liked: likedSet.has(t.id) }));
}