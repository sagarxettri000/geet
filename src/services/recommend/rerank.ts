import { EXPLORATION } from "@/services/recommend/weights";
import type { Candidate, CandidateSource, FeedRow } from "@/services/recommend/types";

export interface RowNames {
  artistOf: (artistKey: string) => string;
  genreOf: (genreId: string) => string;
}

export interface RowGroup {
  rowType: CandidateSource;
  title: string;
  subtitle: string;
  reason: string;
  key: string;
  items: Candidate[];
}

const SIMPLE_TITLES: Partial<Record<CandidateSource, { title: string; subtitle: string; reason: string }>> = {
  continue_watching: { title: "Continue listening", subtitle: "Pick up where you left off", reason: "continue_watching" },
  session_intent: { title: "Based on your recent listens", subtitle: "Keep the vibe going", reason: "session_intent" },
  trending: { title: "Trending now", subtitle: "What's moving across GEET", reason: "trending" },
  fresh: { title: "Fresh finds", subtitle: "Recently added to GEET", reason: "new_for_you" },
};

export function composeRows(scored: Candidate[], names: RowNames): RowGroup[] {
  const byArtist = new Map<string, Candidate[]>();
  const byGenre = new Map<string, Candidate[]>();
  const byExploration = new Map<string, Candidate[]>();
  const simple: Partial<Record<CandidateSource, Candidate[]>> = {};
  const used = new Set<string>();

  for (const c of scored) {
    if (used.has(c.track.id)) continue;
    used.add(c.track.id);
    switch (c.source) {
      case "creator_affinity":
      case "user_interest": {
        const list = byArtist.get(c.artistKey) ?? [];
        list.push(c);
        byArtist.set(c.artistKey, list);
        break;
      }
      case "similar_content": {
        if (!c.track.genreId) break;
        const list = byGenre.get(c.track.genreId) ?? [];
        list.push(c);
        byGenre.set(c.track.genreId, list);
        break;
      }
      case "exploration": {
        const list = byExploration.get(c.artistKey) ?? [];
        list.push(c);
        byExploration.set(c.artistKey, list);
        break;
      }
      default: {
        (simple[c.source] ??= []).push(c);
      }
    }
  }

  const groups: RowGroup[] = [];
  const artistCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();

  const pushArtistRows = (map: Map<string, Candidate[]>, prefix: string, subtitle: (k: string) => string) => {
    for (const [key, cands] of map) {
      if (groups.length >= EXPLORATION.maxRows) break;
      const placed = artistCounts.get(key) ?? 0;
      if (placed >= EXPLORATION.artistCap) continue;
      const room = EXPLORATION.rowSize - placed;
      const items = cands.slice(0, room);
      if (items.length === 0) continue;
      artistCounts.set(key, (artistCounts.get(key) ?? 0) + items.length);
      groups.push({
        rowType: "creator_affinity",
        title: `More from ${names.artistOf(key)}`,
        subtitle: subtitle(key),
        reason: "because_you_listened",
        key: `${prefix}-${encodeURIComponent(key)}`,
        items,
      });
    }
  };

  const pushGenreRows = (map: Map<string, Candidate[]>) => {
    for (const [genreId, cands] of map) {
      if (groups.length >= EXPLORATION.maxRows) break;
      const placed = genreCounts.get(genreId) ?? 0;
      if (placed >= EXPLORATION.genreCap) continue;
      const room = EXPLORATION.rowSize - placed;
      const items = cands.slice(0, room);
      if (items.length === 0) continue;
      genreCounts.set(genreId, (genreCounts.get(genreId) ?? 0) + items.length);
      groups.push({
        rowType: "similar_content",
        title: `More ${names.genreOf(genreId)}`,
        subtitle: `Based on your ${names.genreOf(genreId)} listening`,
        reason: "similar_to_recently_watched",
        key: `because-genre-${genreId}`,
        items,
      });
    }
  };

  const cont = simple["continue_watching"];
  if (cont && cont.length > 0) {
    groups.push({
      rowType: "continue_watching",
      title: SIMPLE_TITLES.continue_watching!.title,
      subtitle: SIMPLE_TITLES.continue_watching!.subtitle,
      reason: SIMPLE_TITLES.continue_watching!.reason,
      key: "continue-listening",
      items: cont.slice(0, EXPLORATION.rowSize),
    });
  }

  pushArtistRows(byArtist, "because-artist", (key) => `Because you've been listening to ${names.artistOf(key)}`);

  pushGenreRows(byGenre);

  const session = simple["session_intent"];
  if (session && session.length > 0 && groups.length < EXPLORATION.maxRows) {
    groups.push({
      rowType: "session_intent",
      title: SIMPLE_TITLES.session_intent!.title,
      subtitle: SIMPLE_TITLES.session_intent!.subtitle,
      reason: SIMPLE_TITLES.session_intent!.reason,
      key: "recent-listens",
      items: session.slice(0, EXPLORATION.rowSize),
    });
  }

  const fresh = simple["fresh"];
  if (fresh && fresh.length > 0 && groups.length < EXPLORATION.maxRows) {
    groups.push({
      rowType: "fresh",
      title: SIMPLE_TITLES.fresh!.title,
      subtitle: SIMPLE_TITLES.fresh!.subtitle,
      reason: SIMPLE_TITLES.fresh!.reason,
      key: "fresh-finds",
      items: fresh.slice(0, EXPLORATION.rowSize),
    });
  }

  const trending = simple["trending"];
  if (trending && trending.length > 0 && groups.length < EXPLORATION.maxRows) {
    groups.push({
      rowType: "trending",
      title: SIMPLE_TITLES.trending!.title,
      subtitle: SIMPLE_TITLES.trending!.subtitle,
      reason: SIMPLE_TITLES.trending!.reason,
      key: "trending-now",
      items: trending.slice(0, EXPLORATION.rowSize),
    });
  }

  for (const [key, cands] of byExploration) {
    if (groups.length >= EXPLORATION.maxRows) break;
    groups.push({
      rowType: "exploration",
      title: `Discover ${names.artistOf(key)}`,
      subtitle: "New to your ears",
      reason: "exploration",
      key: `discover-${encodeURIComponent(key)}`,
      items: cands.slice(0, EXPLORATION.rowSize),
    });
  }

  return groups;
}

export function rowsToFeed(rows: RowGroup[], toItem: (c: Candidate) => NonNullable<FeedRow["items"][number]>): FeedRow[] {
  return rows
    .filter((r) => r.items.length > 0)
    .map((r) => ({
      key: r.key,
      title: r.title,
      subtitle: r.subtitle,
      reason: r.reason,
      rowType: r.rowType,
      items: r.items.slice(0, EXPLORATION.rowSize).map(toItem),
    }));
}