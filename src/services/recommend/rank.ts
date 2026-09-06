import { RANKING_WEIGHTS, freshBoostDays } from "@/services/recommend/weights";
import type { Candidate, ProfileData, SessionIntent } from "@/services/recommend/types";

export interface RankContext {
  profile: ProfileData;
  intent: SessionIntent | null;
  picked: Set<string>;
  trending: Set<string>;
}

export interface RankHooks {
  interestMatch: (c: Candidate, ctx: RankContext) => number;
  contentSimilarity: (c: Candidate, ctx: RankContext) => number;
  creatorAffinity: (c: Candidate, ctx: RankContext) => number;
  predictedEngagement: (c: Candidate, ctx: RankContext) => number;
  quality: (c: Candidate, ctx: RankContext) => number;
  freshness: (c: Candidate, ctx: RankContext) => number;
  diversity: (c: Candidate, ctx: RankContext) => number;
  exploration: (c: Candidate, ctx: RankContext) => number;
}

const DEFAULT_HOOKS: RankHooks = {
  interestMatch: (c, ctx) => {
    const genre = c.track.genreId ? (ctx.profile.genreAff[c.track.genreId] ?? 0) : 0;
    const artist = ctx.profile.artistAff[c.artistKey] ?? 0;
    return Math.max(genre, artist);
  },
  contentSimilarity: (c) => {
    const th = 60;
    const ageDays = (Date.now() - c.track.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    return Math.max(0, 1 - Math.abs(ageDays - th) / 60);
  },
  creatorAffinity: (c, ctx) => ctx.profile.artistAff[c.artistKey] ?? 0,
  predictedEngagement: (c) => c.track.popularity / 100,
  quality: (c) => {
    const hasSource = c.track.sources.length > 0 ? 1 : 0;
    const pop = Math.min(1, c.track.popularity / 100);
    return 0.4 * hasSource + 0.3 * pop;
  },
  freshness: (c) => {
    const days = (Date.now() - c.track.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    if (days > freshBoostDays()) return 0;
    return Math.max(0, 1 - days / freshBoostDays());
  },
  diversity: (c) => c.track.id.length > 0 ? 0.15 * (1 - (c.track.popularity / 100)) : 0,
  exploration: (c) => (c.source === "exploration" ? 1 : c.source === "trending" ? 0.2 : 0),
};

export function scoreCandidate(
  c: Candidate,
  ctx: RankContext,
  weights: typeof RANKING_WEIGHTS = RANKING_WEIGHTS,
  hooks: RankHooks = DEFAULT_HOOKS
): number {
  const artistPenalty = ctx.profile.negative.artistKeys.includes(c.artistKey) ? 1 : 0;
  const genrePenalty = c.track.genreId && ctx.profile.negative.genreIds.includes(c.track.genreId) ? 1 : 0;
  const trackPenalty = ctx.profile.negative.trackIds.includes(c.track.id) ? 1 : 0;
  const intentBoost = ctx.intent
    ? 0.2 * ((c.track.genreId && (ctx.intent.genreAff[c.track.genreId] ?? 0)) || (ctx.intent.artistAff[c.artistKey] ?? 0))
    : 0;

  const base =
    weights.interestMatch * hooks.interestMatch(c, ctx) +
    weights.contentSimilarity * hooks.contentSimilarity(c, ctx) +
    weights.creatorAffinity * hooks.creatorAffinity(c, ctx) +
    weights.predictedEngagement * hooks.predictedEngagement(c, ctx) +
    weights.quality * hooks.quality(c, ctx) +
    weights.freshness * hooks.freshness(c, ctx) +
    weights.diversity * hooks.diversity(c, ctx) +
    weights.exploration * hooks.exploration(c, ctx);

  let score = base + intentBoost;

  if (trackPenalty) score -= 1.2;
  if (artistPenalty) score -= 0.9;
  if (genrePenalty) score -= 0.6;

  if (ctx.picked.has(c.track.id)) score -= 2;

  return score;
}

export function rankCandidates(cands: Candidate[], ctx: RankContext, count: number): Candidate[] {
  return [...cands]
    .map((c) => ({ c, s: scoreCandidate(c, ctx) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map((x) => ({ ...x.c, score: x.s }));
}

export { DEFAULT_HOOKS };