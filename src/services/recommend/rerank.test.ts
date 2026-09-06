import { test } from "node:test";
import assert from "node:assert/strict";
import { composeRows } from "./rerank";
import { EXPLORATION } from "./weights";
import type { Candidate, TrackLite } from "./types";

const names = { artistOf: (k: string) => k.split(":")[1] ?? k, genreOf: (g: string) => (g === "g1" ? "Pop" : "Rock") };

function track(id: string, artistId: string, genreId: string): TrackLite {
  return {
    id,
    title: `Track ${id}`,
    artistName: `Artist ${artistId}`,
    artistId: artistId,
    genreId,
    popularity: 60,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    durationSec: 200,
    thumbnailUrl: null,
    thumbnailColor: null,
    albumId: null,
    sources: [{ id: `v-${id}`, provider: "youtube", providerVideoId: `v-${id}`, thumbnailUrl: null }],
  };
}

function cand(id: string, artistId: string, genreId: string, source: Candidate["source"]): Candidate {
  return { track: track(id, artistId, genreId), source, reason: source, artistKey: `id:${artistId}` };
}

test("composeRows dedupes tracks and caps row size", () => {
  const pool: Candidate[] = [];
  for (let i = 0; i < 24; i++) pool.push(cand(`dup-${i % 2}`, "a1", "g1", "creator_affinity"));
  const rows = composeRows(pool, names);
  const items = rows.flatMap((r) => r.items);
  assert.ok(items.length <= EXPLORATION.maxRows * EXPLORATION.rowSize);
  assert.equal(new Set(items.map((i) => i.track.id)).size, items.length);
  rows.forEach((r) => assert.ok(r.items.length <= EXPLORATION.rowSize));
});

test("composeRows groups by artist and keeps artist rows complete", () => {
  const pool: Candidate[] = [
    ...Array.from({ length: 12 }, (_, i) => cand(`a1-${i}`, "a1", "g1", "creator_affinity")),
    ...Array.from({ length: 12 }, (_, i) => cand(`a2-${i}`, "a2", "g1", "user_interest")),
  ];
  const rows = composeRows(pool, names);
  const artistRows = rows.filter((r) => r.key.startsWith("because-artist"));
  assert.equal(artistRows.length, 2);
  assert.ok(artistRows.every((r) => r.items.length > 0));
});

test("composeRows includes fresh, trending and exploration rows", () => {
  const pool: Candidate[] = [
    cand("t1", "a1", "g1", "creator_affinity"),
    cand("f1", "a2", "g2", "fresh"),
    cand("tr1", "a3", "g1", "trending"),
    cand("e1", "a4", "g2", "exploration"),
  ];
  const rows = composeRows(pool, names);
  const types = rows.map((r) => r.rowType);
  assert.ok(types.includes("fresh"));
  assert.ok(types.includes("trending"));
  assert.ok(types.includes("exploration"));
  const discover = rows.find((r) => r.rowType === "exploration");
  assert.ok(discover?.title.startsWith("Discover"));
});