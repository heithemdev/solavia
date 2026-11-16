import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../packages/db/package.json", import.meta.url));
require("dotenv").config({ path: fileURLToPath(new URL("../apps/web/.env.local", import.meta.url)), quiet: true });
assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
const { Client } = require("pg");
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  await client.query("BEGIN");
  // Temporary tables shadow the real tables; no real customer/order data is changed.
  await client.query('CREATE TEMP TABLE "Customer" (phone VARCHAR(10) PRIMARY KEY, number INTEGER NOT NULL UNIQUE) ON COMMIT DROP');
  await client.query('INSERT INTO "Customer" VALUES ($1, 1)', ["0550000000"]);
  await client.query(readFileSync(new URL("../packages/db/prisma/migrations/202611170001_customer_sessions/migration.sql", import.meta.url), "utf8"));
  const source = readFileSync(new URL("../apps/web/lib/server/orders.ts", import.meta.url), "utf8");
  const allocation = source.match(/INSERT INTO "Customer"[\s\S]*?RETURNING number/)[0]
    .replace('${phone}', '$1')
    .replace('${hash(`${day.toISOString()}:${input.sessionId}`)}', '$2');
  const allocate = async (phone, session) => (await client.query(`WITH reserved AS (SELECT 1) ${allocation}`, [phone, session])).rows[0].number;
  assert.equal(await allocate("0550000000", "day-one-session"), 2);
  assert.equal(await allocate("0550000000", "day-one-session"), 2);
  assert.equal(await allocate("0550000000", "day-two-session"), 3);
  assert.equal(await allocate("0660000000", "day-two-session"), 4);
  assert.equal((await client.query('SELECT number FROM "Customer" WHERE "sessionKey" = $1', ["legacy"])).rows[0].number, 1);
  console.log("PASS: migration preserves history; phone/session deduplication and repeat-session numbering work.");
} finally {
  await client.query("ROLLBACK").catch(() => {});
  await client.end();
}
