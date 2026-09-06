import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreCandidate, rankCandidates } from "./rank";
import { decayFactor } from "./weights";
import type { Candidate, ProfileData, TrackLite } from "./types";

const goodProfile: ProfileData = {
  artistAff: { "id:a1": 1, "id:a2": 0.5 },
  genreAff: { g1: 1, g2: 0.3 },
  formatPrefs: { short: 0.5, medium: 0.3, long: 0.2 },
  negative: { trackIds: [], artistKeys: [], genreIds: [], types: {} },
  signalCount: 50,
  updatedAt: new Date().toISOString(),
};

function track(over: Partial<TrackLite>): TrackLite {
  return {
    id: "t1",
    title: "Track",
    artistName: "Artist A",
    artistId: "a1",
    genreId: "g1",
    popularity: 80,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    durationSec: 180,
    thumbnailUrl: null,
    thumbnailColor: null,
    albumId: null,
    sources: [{ id: "v1", provider: "youtube", providerVideoId: "v1", thumbnailUrl: null }],
    ...over,
  };
}

function candidate(over: Partial<Candidate> & { track?: TrackLite }): Candidate {
  return {
    track: over.track ?? track({}),
    source: over.source ?? "user_interest",
    reason: over.reason ?? "reason",
    artistKey: over.artistKey ?? "id:a1",
  };
}

test("decayFactor starts at 1 and falls exponentially", () => {
  assert.equal(decayFactor(0), 1);
  const older = decayFactor(30);
  assert.ok(older < 1);
  assert.ok(decayFactor(90) < decayFactor(30));
  assert.ok(older > 0);
});

test("high artist/genre affinity outranks low affinity", () => {
  const a = candidate({ track: track({ id: "match" }) });
  const b = candidate({
    track: track({ id: "low", artistId: "a9", genreId: "g9" }),
    artistKey: "id:a9",
  });
  const ctx = { profile: goodProfile, intent: null, picked: new Set<string>(), trending: new Set<string>() };
  assert.ok(scoreCandidate(a, ctx) > scoreCandidate(b, ctx));
});

test("negative feedback penalizes strongly", () => {
  const base = candidate({});
  const negated = candidate({ track: track({ id: "neg" }) });
  const ctx: Parameters<typeof scoreCandidate>[1] = {
    profile: {
      ...goodProfile,
      negative: { trackIds: ["neg"], artistKeys: [], genreIds: [], types: { not_interested: 1 } },
    },
    intent: null,
    picked: new Set<string>(),
    trending: new Set<string>(),
  };
  assert.ok(scoreCandidate(base, ctx) > scoreCandidate(negated, ctx));
});

test("session intent boosts matching tracks", () => {
  const plain = candidate({ track: track({ id: "p", genreId: "g9", artistId: "a9" }), artistKey: "id:a9" });
  const boosted = candidate({ track: track({ id: "b", genreId: "g9", artistId: "a9" }), artistKey: "id:a9" });
  const noIntent: Parameters<typeof scoreCandidate>[1] = {
    profile: goodProfile,
    intent: null,
    picked: new Set<string>(),
    trending: new Set<string>(),
  };
  const withIntent: Parameters<typeof scoreCandidate>[1] = {
    profile: goodProfile,
    intent: { genreAff: { g9: 1 }, artistAff: { "id:a9": 1 } },
    picked: new Set<string>(),
    trending: new Set<string>(),
  };
  assert.ok(scoreCandidate(boosted, withIntent) > scoreCandidate(plain, noIntent));
});

test("rankCandidates returns sorted, capped list", () => {
  const ctx: Parameters<typeof rankCandidates>[1] = {
    profile: goodProfile,
    intent: null,
    picked: new Set<string>(),
    trending: new Set<string>(),
  };
  const pool = [
    candidate({ track: track({ id: "low", artistId: "a9", genreId: "g9" }), artistKey: "id:a9" }),
    candidate({ track: track({ id: "mid", artistId: "a2", genreId: "g2" }), artistKey: "id:a2" }),
    candidate({ track: track({ id: "top" }), artistKey: "id:a1" }),
  ];
  const ranked = rankCandidates(pool, ctx, 2);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].track.id, "top");
  assert.ok(typeof ranked[0].score === "number");
});