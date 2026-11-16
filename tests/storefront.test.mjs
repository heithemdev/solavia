import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkoutSession } from "../apps/web/lib/checkout-session.ts";
import { normalizeLocationSearch } from "../apps/web/lib/location-search.ts";

const data = (name) => JSON.parse(readFileSync(new URL(`../apps/web/lib/data/${name}.json`, import.meta.url), "utf8"));

test("every Arabic commune has a searchable French name", () => {
  const french = data("algeria-fr");
  for (const wilaya of data("algeria-58")) {
    for (const commune of wilaya.communes) {
      assert.ok(french[commune.id]?.commune, `Missing French name for ${commune.id}`);
      const searchable = normalizeLocationSearch(`${commune.name} ${french[commune.id].commune}`);
      assert.ok(searchable.includes(normalizeLocationSearch(commune.name)));
      assert.ok(searchable.includes(normalizeLocationSearch(french[commune.id].commune.toUpperCase())));
    }
  }
  assert.equal(normalizeLocationSearch("Béjaïa"), "bejaia");
  assert.equal(normalizeLocationSearch("Aïn-Témouchent"), "ain temouchent");
});

test("checkout session survives retries and changes after inactivity or a new Algerian day", () => {
  const storage = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const start = Date.parse("2026-11-17T12:00:00+01:00");
  const first = checkoutSession(start);
  assert.equal(checkoutSession(start + 1000), first);
  assert.equal(checkoutSession(start + 29 * 60_000), first);
  const next = checkoutSession(start + 60 * 60_000);
  assert.notEqual(next, first);
  assert.equal(checkoutSession(start + 60 * 60_000 + 1), next);
  const midnight = Date.parse("2026-11-18T00:00:00+01:00");
  const before = checkoutSession(midnight - 1000);
  assert.notEqual(checkoutSession(midnight), before);
  globalThis.sessionStorage = {
    getItem() { throw new Error("Storage blocked"); },
    setItem() { throw new Error("Storage blocked"); },
  };
  assert.equal(checkoutSession(midnight + 1), checkoutSession(midnight + 2));
});
