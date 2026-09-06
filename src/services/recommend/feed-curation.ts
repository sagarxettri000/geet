import { MIX } from "./weights";

export type FeedCat =
  | "personalized"
  | "similar"
  | "artist"
  | "trending"
  | "fresh"
  | "exploration"
  | "popular"
  | "heard";

export const CAT_ORDER: FeedCat[] = [
  "personalized",
  "similar",
  "artist",
  "trending",
  "fresh",
  "exploration",
  "popular",
  "heard",
];

const QUOTA_CATS: FeedCat[] = [
  "personalized",
  "similar",
  "artist",
  "trending",
  "fresh",
  "exploration",
];

export type QueueLayout = Record<FeedCat, string[]>;

export function tagRankedSource(source: string): FeedCat {
  switch (source) {
    case "creator_affinity":
      return "artist";
    case "similar_content":
      return "similar";
    case "session_intent":
    case "continue_watching":
      return "personalized";
    case "fresh":
      return "fresh";
    case "trending":
      return "trending";
    case "exploration":
      return "exploration";
    default:
      return "personalized";
  }
}

export function randomSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function encodeCursor(seed: string, pointers: number[]): string {
  return Buffer.from(JSON.stringify({ v: seed, q: pointers }), "utf8").toString(
    "base64url"
  );
}

export function decodeCursor(
  cursor: string | undefined
): { seed: string; pointers: number[] } | null {
  if (!cursor) return null;
  try {
    const raw = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      v?: unknown;
      q?: unknown;
    };
    if (typeof raw.v !== "string" || !Array.isArray(raw.q)) return null;
    const pointers = raw.q.map((n) =>
      Math.max(0, Math.floor(Number(n) || 0))
    );
    return { seed: raw.v.slice(0, 64), pointers };
  } catch {
    return null;
  }
}

export interface ComposeResult {
  ids: string[];
  hasMore: boolean;
}

export function composeNext(
  queues: QueueLayout,
  pointers: number[],
  limit: number
): ComposeResult & { nextPointers: number[] } {
  const nextPointers = CAT_ORDER.map(
    (cat, i) => pointers[i] ?? 0
  );
  const wanted = Math.max(0, limit);
  const out: string[] = [];

  const takeFrom = (cat: FeedCat, max: number) => {
    const q = queues[cat] ?? [];
    const i = CAT_ORDER.indexOf(cat);
    const start = Math.min(nextPointers[i], q.length);
    const n = Math.min(max, q.length - start);
    for (let k = 0; k < n; k++) out.push(q[start + k]);
    nextPointers[i] = start + n;
  };

  const totalWeight =
    QUOTA_CATS.reduce((sum, cat) => sum + (MIX[cat] ?? 0), 0) || 1;

  for (const cat of QUOTA_CATS) {
    if (out.length >= wanted) break;
    const share = Math.max(
      1,
      Math.round(((MIX[cat] ?? 0) / totalWeight) * wanted)
    );
    takeFrom(cat, Math.min(share, wanted - out.length));
  }

  for (const cat of ["popular", "heard"] as FeedCat[]) {
    if (out.length >= wanted) break;
    takeFrom(cat, wanted - out.length);
  }

  for (const cat of QUOTA_CATS) {
    if (out.length >= wanted) break;
    takeFrom(cat, wanted - out.length);
  }

  const hasMore = CAT_ORDER.some(
    (cat, i) => (queues[cat]?.length ?? 0) > nextPointers[i]
  );
  return { ids: out, nextPointers, hasMore };
}