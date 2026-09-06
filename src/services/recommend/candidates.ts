import { db } from "@/lib/db";
import { getTrendingTrackIds } from "@/services/recommend/trending";
import { artistKeyOf, type Candidate, type ProfileData, type SessionIntent, type TrackLite } from "@/services/recommend/types";

export interface CandidateContext {
  userId: string;
  profile: ProfileData;
  heard: Set<string>;
  picked: Set<string>;
  intent: SessionIntent | null;
}

export async function generateCandidates(ctx: CandidateContext, cap = 320): Promise<Candidate[]> {
  const { profile, heard, picked, intent } = ctx;
  const found = new Map<string, Candidate>();

  const add = (track: TrackLite, source: Candidate["source"], reason: string) => {
    if (found.has(track.id)) return;
    if (track.sources.length === 0) return;
    found.set(track.id, { track, source, reason, artistKey: artistKeyOf(track.artistId, track.artistName) });
  };

  const notHeard = { notIn: [...heard, ...picked] };

  const topArtistKeys = Object.keys(profile.artistAff).slice(0, 8);
  const topGenreIds = Object.keys(profile.genreAff).slice(0, 5);

  if (topArtistKeys.length > 0) {
    const byId = topArtistKeys.filter((k) => k.startsWith("id:")).map((k) => k.slice(3));
    const byName = topArtistKeys.filter((k) => k.startsWith("name:")).map((k) => k.slice(5));
    if (byId.length > 0) {
      const tracks = await db.track.findMany({
        where: { artistId: { in: byId }, id: notHeard },
        include: { sources: true },
        orderBy: [{ popularity: "desc" }],
        take: 60,
      });
      for (const t of tracks) add(t as unknown as TrackLite, "creator_affinity", "From an artist you keep listening to");
    }
    if (byName.length > 0) {
      const tracks = await db.track.findMany({
        where: { artistName: { in: byName }, id: notHeard },
        include: { sources: true },
        orderBy: [{ popularity: "desc" }],
        take: 40,
      });
      for (const t of tracks) add(t as unknown as TrackLite, "creator_affinity", "From an artist you keep listening to");
    }
  }

  if (topGenreIds.length > 0) {
    const tracks = await db.track.findMany({
      where: { genreId: { in: topGenreIds }, id: notHeard },
      include: { sources: true },
      orderBy: [{ popularity: "desc" }],
      take: 80,
    });
    for (const t of tracks) add(t as unknown as TrackLite, "user_interest", "Matches your strongest listening interests");
  }

  if (intent) {
    const intentGenres = Object.keys(intent.genreAff).slice(0, 3);
    if (intentGenres.length > 0) {
      const tracks = await db.track.findMany({
        where: { genreId: { in: intentGenres }, id: notHeard },
        include: { sources: true },
        orderBy: [{ popularity: "desc" }],
        take: 40,
      });
      for (const t of tracks) {
        add(t as unknown as TrackLite, "session_intent", "Similar to what you've been listening to recently");
      }
    }
  }

  if (topGenreIds.length > 0) {
    const tracks = await db.track.findMany({
      where: { genreId: { in: topGenreIds.slice(0, 4) }, id: notHeard },
      include: { sources: true },
      orderBy: [{ popularity: "desc" }],
      take: 60,
    });
    for (const t of tracks) {
      if (!found.has(t.id)) add(t as unknown as TrackLite, "similar_content", "Related to tracks you've already enjoyed");
    }
  }

  const trendingIds = await getTrendingTrackIds(30);
  if (trendingIds.length > 0) {
    const trendingTracks = await db.track.findMany({
      where: { id: { in: trendingIds.filter((id) => !heard.has(id) && !picked.has(id)) } },
      include: { sources: true },
    });
    for (const t of trendingTracks) add(t as unknown as TrackLite, "trending", "Trending across GEET right now");
  }

  const freshTracks = await db.track.findMany({
    where: { id: notHeard },
    include: { sources: true },
    orderBy: [{ createdAt: "desc" }],
    take: 40,
  });
  for (const t of freshTracks) add(t as unknown as TrackLite, "fresh", "Recently added to GEET");

  const cont = await db.listeningHistory.findMany({
    where: { userId: ctx.userId },
    include: {
      track: {
        include: { sources: true },
      },
    },
    orderBy: { playedAt: "desc" },
    take: 12,
  });
  for (const h of cont) {
    const t = h.track as unknown as TrackLite;
    if (found.has(t.id)) continue;
    if (h.completion != null && h.completion >= 90) continue;
    found.set(t.id, {
      track: t,
      source: "continue_watching",
      reason: "Pick up where you left off",
      artistKey: artistKeyOf(t.artistId, t.artistName),
    });
  }

  await expandExploration(ctx, found, notHeard, cap);

  return [...found.values()].slice(0, cap);
}

async function expandExploration(ctx: CandidateContext, found: Map<string, Candidate>, notHeard: { notIn: string[] }, cap: number) {
  const listenedArtistIds = Object.keys(ctx.profile.artistAff)
    .filter((k) => k.startsWith("id:"))
    .map((k) => k.slice(3));

  const artists = await db.artist.findMany({
    where: listenedArtistIds.length ? { id: { notIn: listenedArtistIds } } : undefined,
    orderBy: { monthlyListeners: "desc" },
    take: 40,
  });

  for (const artist of artists) {
    if (found.size >= cap) return;
    const tracks = await db.track.findMany({
      where: { artistId: artist.id, id: notHeard },
      include: { sources: true },
      orderBy: [{ popularity: "desc" }],
      take: 8,
    });
    for (const t of tracks) {
      if (found.has(t.id)) continue;
      const lite = t as unknown as TrackLite;
      found.set(lite.id, {
        track: lite,
        source: "exploration",
        reason: "Something new you haven't discovered yet",
        artistKey: artistKeyOf(lite.artistId, lite.artistName),
      });
      if (found.size >= cap) return;
    }
  }
}
