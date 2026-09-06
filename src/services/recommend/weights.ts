export const EVENT_WEIGHTS: Record<string, number> = {
  impression: 0.05,
  click: 0.1,
  open: 0.3,
  play_start: 0.4,
  play: 0.35,
  watch_progress: 0.3,
  pause: 0.1,
  resume: 0.1,
  complete: 1.0,
  rewatch: 1.2,
  like: 1.2,
  dislike: -1.5,
  save: 1.0,
  share: 1.2,
  follow: 2.0,
  unfollow: -1.5,
  hide: -2.0,
  not_interested: -3.0,
  skip: -0.3,
  add_to_playlist: 0.9,
  remove_from_playlist: -0.6,
};

export type NegFeedbackType = "hide" | "not_interested" | "dislike" | "unfollow";

export const EVENT_TYPES = [
  "impression",
  "click",
  "open",
  "play_start",
  "play",
  "pause",
  "resume",
  "watch_progress",
  "complete",
  "rewatch",
  "skip",
  "like",
  "dislike",
  "save",
  "share",
  "follow",
  "unfollow",
  "hide",
  "not_interested",
  "search",
  "search_result_click",
  "category_click",
  "creator_click",
  "add_to_playlist",
  "remove_from_playlist",
  "session_start",
  "session_end",
] as const;

export const DECAY_LAMBDA = 0.02;

export const PROFILE_WINDOW_DAYS = 90;
export const HEARD_WINDOW = 1000;
export const SESSION_INTENT_WINDOW_HOURS = 48;

export const RANKING_WEIGHTS = {
  interestMatch: 0.25,
  contentSimilarity: 0.2,
  creatorAffinity: 0.15,
  predictedEngagement: 0.15,
  quality: 0.1,
  freshness: 0.05,
  diversity: 0.05,
  exploration: 0.05,
};

export const FEED = {
  rankedCap: 500,
  catalogCap: 50_000,
  cacheMs: 5 * 60 * 1000,
  defaultPageSize: 30,
  maxLimit: 100,
  freshNewDays: 30,
  dismissImpressions: 5,
  signalWindowDays: 30,
};

export const MIX = {
  personalized: 10,
  similar: 6,
  artist: 4,
  trending: 4,
  fresh: 3,
  exploration: 3,
  popular: 0,
  heard: 0,
  ignored: 0,
} as const;

export const EXPLORATION = {
  exploitationShare: 0.75,
  explorationShare: 0.15,
  trendingFreshShare: 0.1,
  artistCap: 10,
  genreCap: 12,
  maxRows: 24,
  rowSize: 10,
  minExplorationRows: 3,
  minTrendingRows: 1,
  minFreshRows: 1,
};

export const TRENDING = {
  windowDays: 7,
  velocityHours: 24,
  cacheMs: 15 * 60 * 1000,
  velocityWeight: 3,
};

export function decayFactor(ageDays: number, lambda = DECAY_LAMBDA): number {
  return Math.exp(-lambda * Math.max(0, ageDays));
}

export function freshBoostDays(): number {
  return 14;
}