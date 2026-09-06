import type { Track } from "@/types/music";

export interface TrackLite {
  id: string;
  title: string;
  artistName: string;
  artistId: string | null;
  genreId: string | null;
  popularity: number;
  createdAt: Date;
  durationSec: number | null;
  thumbnailUrl: string | null;
  thumbnailColor: string | null;
  albumId: string | null;
  sources: Array<{ id: string; provider: string; providerVideoId: string; thumbnailUrl: string | null }>;
}

export interface NegativeSignals {
  trackIds: string[];
  artistKeys: string[];
  genreIds: string[];
  types: Record<string, number>;
}

export interface ProfileData {
  artistAff: Record<string, number>;
  genreAff: Record<string, number>;
  formatPrefs: { short: number; medium: number; long: number };
  negative: NegativeSignals;
  signalCount: number;
  updatedAt: string;
}

export interface SessionIntent {
  artistAff: Record<string, number>;
  genreAff: Record<string, number>;
  label?: string;
}

export type CandidateSource =
  | "user_interest"
  | "similar_content"
  | "creator_affinity"
  | "trending"
  | "fresh"
  | "continue_watching"
  | "session_intent"
  | "exploration";

export interface Candidate {
  track: TrackLite;
  source: CandidateSource;
  reason: string;
  artistKey: string;
  score?: number;
}

export interface FeedRow {
  key: string;
  title: string;
  subtitle: string;
  reason: string;
  rowType: CandidateSource;
  items: Track[];
}

export interface RecommendationFeed {
  sections: FeedRow[];
  composedAt: string;
}

export function artistKeyOf(artistId: string | null, artistName: string): string {
  return artistId ? `id:${artistId}` : `name:${artistName}`;
}