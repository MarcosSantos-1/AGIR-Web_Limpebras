import assert from "node:assert/strict";
import test from "node:test";
import { cachedSubscription, createCache } from "../src/lib/cache-store.ts";

function fixture() {
  const data = new Map();
  const storage = {
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) { data.set(key, value); },
    async removeItem(key) { data.delete(key); },
  };
  let time = 1_000;
  return { data, storage, cache: createCache(storage, () => time), advance: (ms) => { time += ms; } };
}

test("cache is isolated by account and resource, expires, and ignores corrupt entries", async () => {
  const { data, cache, advance } = fixture();
  await cache.write("alice", "survey-a", [{ id: 1 }]);
  assert.deepEqual(await cache.read("alice", "survey-a"), [{ id: 1 }]);
  assert.equal(await cache.read("bob", "survey-a"), null);
  assert.equal(await cache.read("alice", "survey-b"), null);
  advance(24 * 60 * 60 * 1000 + 1);
  assert.equal(await cache.read("alice", "survey-a"), null);
  for (const key of data.keys()) data.set(key, "broken json");
  assert.equal(await cache.read("alice", "survey-a"), null);
});

test("a slow cache read never replaces a fresh cloud snapshot", async () => {
  const { storage } = fixture();
  let release;
  const cache = createCache({ ...storage, getItem: () => new Promise((resolve) => { release = resolve; }) });
  const seen = [];
  const stop = cachedSubscription(cache, "alice", "records", (next) => {
    next([2]); return () => undefined;
  }, (items) => seen.push(items), () => undefined);
  release(JSON.stringify({ savedAt: Date.now(), data: [1] }));
  await new Promise((resolve) => setImmediate(() => resolve()));
  assert.deepEqual(seen, [[2]]);
  stop();
});

test("cached data renders before the cloud, and an unsubscribed listener cannot update it", async () => {
  const { cache } = fixture();
  await cache.write("alice", "records", [1]);
  let cloudNext;
  let stopped = false;
  const seen = [];
  const stop = cachedSubscription(cache, "alice", "records", (next) => {
    cloudNext = next; return () => { stopped = true; };
  }, (items) => seen.push(items), () => undefined);
  await new Promise((resolve) => setImmediate(() => resolve()));
  assert.deepEqual(seen, [[1]]);
  cloudNext([2]);
  stop();
  cloudNext([3]);
  assert.equal(stopped, true);
  assert.deepEqual(seen, [[1], [2]]);
});

test("permission denial clears cached records instead of restoring them", async () => {
  const { cache } = fixture();
  await cache.write("alice", "records", [1]);
  const seen = [];
  let deny;
  const stop = cachedSubscription(cache, "alice", "records", (_, fail) => {
    deny = fail; return () => undefined;
  }, (items) => seen.push(items), () => undefined);
  await new Promise((resolve) => setImmediate(() => resolve()));
  deny(Object.assign(new Error("Denied"), { code: "permission-denied" }));
  await new Promise((resolve) => setImmediate(() => resolve()));
  assert.deepEqual(seen, [[1], []]);
  assert.equal(await cache.read("alice", "records"), null);
  stop();
});
