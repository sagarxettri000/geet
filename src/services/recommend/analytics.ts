import { db } from "@/lib/db";

export async function getRecommendationAnalytics() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const [plays7d, complete7d, impressions7d, clicks7d, negatives7d, sessions7d, impressionTracks, impressionsSections] =
    await Promise.all([
      db.userEvent.count({ where: { eventType: { in: ["play_start", "play"] }, createdAt: { gte: new Date(now - 7 * day) } } }),
      db.userEvent.count({ where: { eventType: { in: ["complete", "rewatch"] }, createdAt: { gte: new Date(now - 7 * day) } } }),
      db.userEvent.count({ where: { eventType: "impression", createdAt: { gte: new Date(now - 7 * day) } } }),
      db.userEvent.count({ where: { eventType: { in: ["click", "open"] }, createdAt: { gte: new Date(now - 7 * day) } } }),
      db.userEvent.count({ where: { eventType: { in: ["hide", "not_interested", "dislike"] }, createdAt: { gte: new Date(now - 7 * day) } } }),
      db.userEvent.count({ where: { eventType: "session_start", createdAt: { gte: new Date(now - 7 * day) } } }),
      db.userEvent.count({ where: { eventType: "impression" } }),
      db.recommendationImpression.groupBy({ by: ["section"], where: { createdAt: { gte: new Date(now - 7 * day) } }, _count: { _all: true }, orderBy: { _count: { createdAt: "desc" } }, take: 200 }),
    ]);

  const distinctArtists = await db.userEvent.groupBy({
    by: ["trackId"],
    where: { eventType: { in: ["play_start", "play"] }, createdAt: { gte: new Date(now - 7 * day) }, trackId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { createdAt: "desc" } },
    take: 5000,
  });

  const playsByTrack = await db.userEvent.groupBy({
    by: ["trackId"],
    where: { eventType: { in: ["play_start", "play"] }, createdAt: { gte: new Date(now - 7 * day) }, trackId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { createdAt: "desc" } },
    take: 5000,
  });
  playsByTrack.sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0));

  const completionRate = plays7d > 0 ? Math.round((complete7d / plays7d) * 1000) / 10 : 0;
  const ctr = impressions7d > 0 ? Math.round((clicks7d / impressions7d) * 1000) / 10 : 0;

  return {
    window: "last_7_days",
    plays: plays7d,
    completions: complete7d,
    completionRate,
    impressions: impressions7d,
    clicks: clicks7d,
    ctr,
    negativeFeedback: negatives7d,
    sessions7d,
    avgPlaysPerTrack7d: distinctArtists.length ? Math.round((plays7d / distinctArtists.length) * 10) / 10 : 0,
    distinctTracksPlayed7d: distinctArtists.length,
    topPlayedTracks: playsByTrack.slice(0, 5).map((g) => ({ trackId: g.trackId, plays: g._count._all ?? 0 })),
    topSections: impressionsSections
      .sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0))
      .slice(0, 20)
      .map((g) => ({ section: g.section, impressions: g._count._all ?? 0 })),
    impressionShare: impressionTracks > 0 ? Math.round((impressions7d / impressionTracks) * 1000) / 10 : 0,
  };
}

export async function getActivitySummary(userId: string) {
  const day = 24 * 60 * 60 * 1000;
  const [plays, completions, likes, negatives, explored] = await Promise.all([
    db.userEvent.count({ where: { userId, eventType: { in: ["play_start", "play"] }, createdAt: { gte: new Date(Date.now() - 7 * day) } } }),
    db.userEvent.count({ where: { userId, eventType: { in: ["complete", "rewatch"] }, createdAt: { gte: new Date(Date.now() - 7 * day) } } }),
    db.userEvent.count({ where: { userId, eventType: "like", createdAt: { gte: new Date(Date.now() - 7 * day) } } }),
    db.userEvent.count({ where: { userId, eventType: { in: ["hide", "not_interested", "dislike"] }, createdAt: { gte: new Date(Date.now() - 7 * day) } } }),
    db.userEvent.count({ where: { userId, eventType: { in: ["play_start", "play"] }, source: "home_feed", createdAt: { gte: new Date(Date.now() - 7 * day) } } }),
  ]);
  return { plays, completions, likes, negatives, explored };
}