import { db } from "@/lib/db";
import {
  DECAY_LAMBDA,
  EVENT_WEIGHTS,
  HEARD_WINDOW,
  PROFILE_WINDOW_DAYS,
  SESSION_INTENT_WINDOW_HOURS,
} from "@/services/recommend/weights";
import { artistKeyOf, type ProfileData, type SessionIntent } from "@/services/recommend/types";

const CACHE_TTL_MS = 60 * 1000;
const INTENT_TTL_MS = 120 * 1000;

const profileCache = new Map<string, { at: number; data: ProfileData }>();
const intentCache = new Map<string, { at: number; data: SessionIntent | null }>();

const POSITIVE_EVENTS = new Set([
  "play_start",
  "play",
  "watch_progress",
  "complete",
  "rewatch",
  "like",
  "save",
  "share",
  "follow",
  "add_to_playlist",
]);
const NEGATIVE_EVENTS = new Set(["dislike", "skip", "hide", "not_interested", "unfollow", "remove_from_playlist"]);

type TrackInfo = { id: string; artistId: string | null; artistName: string; genreId: string | null };

export async function getProfile(userId: string): Promise<ProfileData> {
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;
  const data = await buildProfileFromSignals(userId);
  profileCache.set(userId, { at: Date.now(), data });
  return data;
}

export function clearProfileCache(userId?: string) {
  if (userId) {
    profileCache.delete(userId);
    intentCache.delete(userId);
    return;
  }
  profileCache.clear();
  intentCache.clear();
}

async function buildProfileFromSignals(userId: string): Promise<ProfileData> {
  const since = new Date(Date.now() - PROFILE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [events, history, likes, follows] = await Promise.all([
    db.userEvent.findMany({
      where: {
        userId,
        eventType: { in: [...POSITIVE_EVENTS, ...NEGATIVE_EVENTS] },
        createdAt: { gte: since },
      },
      select: { eventType: true, trackId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 800,
    }),
    db.listeningHistory.findMany({
      where: { userId, playedAt: { gte: since } },
      include: { track: { select: { id: true, artistId: true, artistName: true, genreId: true } } },
      orderBy: { playedAt: "desc" },
      take: 300,
    }),
    db.likedTrack.findMany({
      where: { userId },
      include: { track: { select: { id: true, artistId: true, artistName: true, genreId: true } } },
      orderBy: { likedAt: "desc" },
      take: 150,
    }),
    db.followedArtist.findMany({
      where: { userId },
      include: { artist: { select: { id: true, name: true } } },
      orderBy: { followedAt: "desc" },
    }),
  ]);

  const now = Date.now();
  const artistAff = new Map<string, number>();
  const genreAff = new Map<string, number>();

  const eventTrackIds = [...new Set(events.map((e) => e.trackId).filter(Boolean) as string[])];
  const trackInfoById = new Map<string, TrackInfo>();
  if (eventTrackIds.length > 0) {
    const rows = await db.track.findMany({
      where: { id: { in: eventTrackIds } },
      select: { id: true, artistId: true, artistName: true, genreId: true },
    });
    for (const r of rows) trackInfoById.set(r.id, r);
  }

  const apply = (map: Map<string, number>, key: string, value: number) => {
    map.set(key, (map.get(key) ?? 0) + value);
  };

  const negativeTypes: Record<string, number> = {};
  for (const e of events) {
    if (!POSITIVE_EVENTS.has(e.eventType)) {
      negativeTypes[e.eventType] = (negativeTypes[e.eventType] ?? 0) + 1;
      continue;
    }
    const info = e.trackId ? trackInfoById.get(e.trackId) : undefined;
    if (!info) continue;
    const weight = (EVENT_WEIGHTS[e.eventType] ?? 0) * decayAge(e.createdAt.getTime(), now);
    if (info.artistId || info.artistName) {
      apply(artistAff, artistKeyOf(info.artistId, info.artistName), weight);
    }
    if (info.genreId) apply(genreAff, info.genreId, weight);
  }

  for (const h of history) {
    const t = h.track;
    const weight = EVENT_WEIGHTS["play_start"] * decayAge(h.playedAt.getTime(), now);
    if (t.artistId || t.artistName) apply(artistAff, artistKeyOf(t.artistId, t.artistName), weight);
    if (t.genreId) apply(genreAff, t.genreId, weight);
  }

  for (const l of likes) {
    const t = l.track;
    const weight = EVENT_WEIGHTS["like"] * decayAge(l.likedAt.getTime(), now) * 2;
    if (t.artistId || t.artistName) apply(artistAff, artistKeyOf(t.artistId, t.artistName), weight);
    if (t.genreId) apply(genreAff, t.genreId, weight);
  }

  for (const f of follows) {
    apply(artistAff, `id:${f.artist.id}`, EVENT_WEIGHTS["follow"] * decayAge(f.followedAt.getTime(), now) * 3);
  }

  const negative = await buildNegativeSignals(userId);

  return {
    artistAff: pickTop(normalizeByMax(artistAff), 24),
    genreAff: pickTop(normalizeByMax(genreAff), 12),
    formatPrefs: { short: 0, medium: 0, long: 0 },
    negative: { ...negative, types: negativeTypes },
    signalCount: events.length + history.length + likes.length + follows.length,
    updatedAt: new Date().toISOString(),
  };
}

async function buildNegativeSignals(userId: string) {
  const [feedback, negEvents] = await Promise.all([
    db.recommendationFeedback.findMany({
      where: { userId, feedbackType: { in: ["hide", "not_interested", "dislike", "unfollow"] } },
      select: { trackId: true, artistId: true, genreId: true, feedbackType: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.userEvent.findMany({
      where: { userId, eventType: { in: ["hide", "not_interested"] } },
      select: { trackId: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const trackIds = new Set<string>();
  const artistKeys = new Set<string>();
  const genreIds = new Set<string>();

  for (const f of feedback) {
    if (f.trackId) trackIds.add(f.trackId);
    if (f.artistId) artistKeys.add(`id:${f.artistId}`);
    if (f.genreId) genreIds.add(f.genreId);
  }
  for (const e of negEvents) if (e.trackId) trackIds.add(e.trackId);

  return { trackIds: [...trackIds], artistKeys: [...artistKeys], genreIds: [...genreIds], types: {} };
}

export async function getHeardTrackIds(userId: string): Promise<Set<string>> {
  const rows = await db.listeningHistory.findMany({
    where: { userId },
    select: { trackId: true },
    orderBy: { playedAt: "desc" },
    take: HEARD_WINDOW,
  });
  return new Set(rows.map((r) => r.trackId));
}

export async function getRecentIntent(userId: string): Promise<SessionIntent | null> {
  const cached = intentCache.get(userId);
  if (cached && Date.now() - cached.at < INTENT_TTL_MS) return cached.data;

  const since = new Date(Date.now() - SESSION_INTENT_WINDOW_HOURS * 60 * 60 * 1000);
  const recent = await db.userEvent.findMany({
    where: { userId, eventType: { in: ["play_start", "play", "watch_progress", "complete"] }, createdAt: { gte: since } },
    include: { track: { select: { id: true, artistId: true, artistName: true, genreId: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const now = Date.now();
  const artistAff = new Map<string, number>();
  const genreAff = new Map<string, number>();
  const halfLife = (SESSION_INTENT_WINDOW_HOURS * 60 * 60 * 1000) / Math.LN2;

  for (const e of recent) {
    const t = e.track;
    if (!t) continue;
    const d = Math.exp(-(now - e.createdAt.getTime()) / halfLife);
    if (t.artistId || t.artistName) {
      const k = artistKeyOf(t.artistId, t.artistName);
      artistAff.set(k, (artistAff.get(k) ?? 0) + d);
    }
    if (t.genreId) genreAff.set(t.genreId, (genreAff.get(t.genreId) ?? 0) + d);
  }

  const intent: SessionIntent | null =
    artistAff.size || genreAff.size
      ? { artistAff: Object.fromEntries(artistAff), genreAff: Object.fromEntries(genreAff) }
      : null;
  intentCache.set(userId, { at: now, data: intent });
  return intent;
}

export async function persistProfile(userId: string, profile: ProfileData) {
  await db.recommendationProfile
    .upsert({
      where: { userId },
      update: { profile: JSON.stringify(profile) },
      create: { userId, profile: JSON.stringify(profile) },
    })
    .catch(() => {});
}

function decayAge(at: number, now: number): number {
  return Math.exp(-DECAY_LAMBDA * Math.max(0, (now - at) / (24 * 60 * 60 * 1000)));
}

function normalizeByMax(m: Map<string, number>): Map<string, number> {
  let max = 0;
  for (const v of m.values()) if (v > max) max = v;
  if (max === 0) return m;
  const out = new Map<string, number>();
  for (const [k, v] of m) out.set(k, v / max);
  return out;
}

function pickTop(m: Map<string, number>, n: number): Record<string, number> {
  return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n));
}