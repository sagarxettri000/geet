import test from "node:test";
import assert from "node:assert/strict";
import {
  CAT_ORDER,
  composeNext,
  decodeCursor,
  encodeCursor,
  randomSeed,
  tagRankedSource,
  QueueLayout,
} from "./feed-curation";

function layout(byCat: Partial<Record<(typeof CAT_ORDER)[number], string[]>>): QueueLayout {
  return Object.fromEntries(
    CAT_ORDER.map((cat) => [cat, byCat[cat] ?? []])
  ) as QueueLayout;
}

const ids = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

test("cursor round-trips seed and pointers", () => {
  const seed = randomSeed();
  const pointers = [3, 0, 12, 1, 0, 7, 4, 0];
  const cursor = encodeCursor(seed, pointers);
  const decoded = decodeCursor(cursor);
  assert.ok(decoded);
  assert.equal(decoded.seed, seed);
  assert.deepEqual(decoded.pointers, pointers);
  assert.equal(decodeCursor(undefined), null);
  assert.equal(decodeCursor("garbage!!"), null);
});

test("composeNext fills a full 30-item page honoring quotas", () => {
  const queues = layout({
    personalized: ids("p", 50),
    similar: ids("s", 50),
    artist: ids("a", 50),
    trending: ids("t", 50),
    fresh: ids("f", 50),
    exploration: ids("e", 50),
    popular: ids("po", 50),
    heard: ids("h", 50),
  });
  const { ids: page, nextPointers, hasMore } = composeNext(queues, CAT_ORDER.map(() => 0), 30);
  assert.equal(page.length, 30);
  assert.equal(nextPointers[0], 10);
  assert.equal(nextPointers[1], 6);
  assert.equal(nextPointers[2], 4);
  assert.equal(nextPointers[3], 4);
  assert.equal(nextPointers[4], 3);
  assert.equal(nextPointers[5], 3);
  assert.equal(nextPointers[6], 0);
  assert.equal(nextPointers[7], 0);
  assert.equal(nextPointers.reduce((a, b) => a + b, 0), 30);
  assert.equal(hasMore, true);
});

test("composeNext tops up from popular/heard when quota categories run out", () => {
  const queues = layout({
    personalized: ids("p", 3),
    similar: [],
    artist: [],
    trending: [],
    fresh: [],
    exploration: [],
    popular: ids("po", 20),
    heard: ids("h", 100),
  });
  const { ids: page, hasMore } = composeNext(queues, CAT_ORDER.map(() => 0), 30);
  assert.equal(page.length, 30);
  assert.ok(page.filter((id) => id.startsWith("p-")).length === 3);
  assert.ok(page.filter((id) => id.startsWith("po-")).length === 20);
  assert.ok(page.filter((id) => id.startsWith("h-")).length === 7);
  assert.equal(hasMore, true);
});

test("composeNext never repeats ids within a page and continents via cursor", () => {
  const queues = layout({
    personalized: ids("p", 10),
    similar: [],
    artist: [],
    trending: [],
    fresh: [],
    exploration: [],
    popular: ids("po", 4),
  });
  const first = composeNext(queues, CAT_ORDER.map(() => 0), 30);
  const second = composeNext(queues, first.nextPointers, 30);
  const all = first.ids.concat(second.ids);
  assert.equal(new Set(all).size, all.length);
  assert.equal(first.ids.length, 14);
  assert.equal(second.ids.length, 0);
  assert.equal(second.hasMore, false);
});

test("composeNext reports hasMore=false once every queue is exhausted", () => {
  const queues = layout({ personalized: ids("p", 6) });
  const first = composeNext(queues, [0, 0, 0, 0, 0, 0, 0, 0], 30);
  assert.equal(first.ids.length, 6);
  assert.equal(first.hasMore, false);
});

test("tagRankedSource maps raw sources to feed categories", () => {
  assert.equal(tagRankedSource("user_interest"), "personalized");
  assert.equal(tagRankedSource("session_intent"), "personalized");
  assert.equal(tagRankedSource("continue_watching"), "personalized");
  assert.equal(tagRankedSource("creator_affinity"), "artist");
  assert.equal(tagRankedSource("similar_content"), "similar");
  assert.equal(tagRankedSource("trending"), "trending");
  assert.equal(tagRankedSource("fresh"), "fresh");
  assert.equal(tagRankedSource("exploration"), "exploration");
});