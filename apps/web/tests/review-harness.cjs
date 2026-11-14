// Disposable browser review database; never seeds the public store.
const { createRequire } = require("node:module");
const path = require("node:path"),
  fs = require("node:fs"),
  { randomUUID } = require("node:crypto"),
  { spawn } = require("node:child_process");
const requireDb = createRequire(path.resolve("packages/db/package.json"));
requireDb("dotenv").config({ path: "apps/web/.env.local" });
const { Client } = requireDb("pg");
const requireWeb = createRequire(path.resolve("apps/web/package.json"));
const schema = `solavia_test_${randomUUID().replaceAll("-", "")}`;
const client = new Client({
  connectionString: process.env.DIRECT_URL,
  connectionTimeoutMillis: 10000,
});
let child,
  cleaning = false;
async function cleanup() {
  if (cleaning) return;
  cleaning = true;
  if (child) child.kill();
  const cleanupClient = new Client({
    connectionString: process.env.DIRECT_URL,
    connectionTimeoutMillis: 10000,
  });
  await cleanupClient.connect();
  await cleanupClient.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await cleanupClient.end();
  process.exit(0);
}
(async () => {
  await client.connect();
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}",public`);
  const migration = fs
    .readFileSync(
      "packages/db/prisma/migrations/202611140001_foundation/migration.sql",
      "utf8",
    )
    .replace('CREATE SCHEMA IF NOT EXISTS "public";', "")
    .replace("CREATE EXTENSION IF NOT EXISTS pg_trgm;", "");
  await client.query(migration);
  await client.query(
    'INSERT INTO "Product" (id,name,"priceCentimes",stock,"baselineStock",active,"updatedAt") VALUES ($1,$2,275000,12,12,true,NOW())',
    ["shaya-bio", "SHAYA BIO"],
  );
  await client.end();
  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync("output/review-schema.json", JSON.stringify({ schema }));
  const env = {
    ...process.env,
    DATABASE_URL: process.env.DIRECT_URL,
    DATABASE_SCHEMA: schema,
  };
  delete env.NODE_OPTIONS;
  child = spawn(
    process.execPath,
    [requireWeb.resolve("next/dist/bin/next"), "start", "--port", "3101"],
    { cwd: path.resolve("apps/web"), env, stdio: "inherit" },
  );
  child.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  console.log(
    "Disposable review available at http://localhost:3101; Ctrl+C removes its test schema",
  );
})().catch(async (error) => {
  console.error(error.message);
  await cleanup();
});
