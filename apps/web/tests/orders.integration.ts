import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { stockChange } from "../lib/order-policy";
const requireDb = createRequire(path.resolve("packages/db/package.json"));
const { Client } = requireDb("pg");
process.env.TEST_SCHEMA = `solavia_test_${randomUUID().replaceAll("-", "")}`;
const schema = process.env.TEST_SCHEMA;
const client = new Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});
await client.connect();
let db: Awaited<typeof import("./database")>["db"] | undefined;
try {
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}", public`);
  const migration = await readFile(
    "packages/db/prisma/migrations/202611140001_foundation/migration.sql",
    "utf8",
  );
  await client.query(
    migration
      .replace('CREATE SCHEMA IF NOT EXISTS "public";', "")
      .replace("CREATE EXTENSION IF NOT EXISTS pg_trgm;", ""),
  );
  db = (await import("./database")).db;
  const { createOrder, changeOrder } = await import("../lib/server/orders");
  await db.product.create({
    data: {
      id: "shaya-bio",
      name: "SHAYA BIO",
      priceCentimes: 275000,
      stock: 5,
      baselineStock: 5,
      active: true,
    },
  });
  const input = {
    idempotencyKey: randomUUID(),
    firstName: "Integration",
    lastName: "Test",
    phone: "0512345678",
    quantity: 2,
    wilayaCode: "16",
    communeId: "",
    deliveryMode: "HOME" as const,
    expectedUnitPriceCentimes: 275000,
    trackingConsent: true,
  };
  const wilayas = (await import("../lib/data/algeria-58.json")).default;
  input.communeId = wilayas.find((w) => w.code === "16")!.communes[0]!.id;
  const [a, b] = await Promise.all([createOrder(input), createOrder(input)]);
  assert.equal(a.order.id, b.order.id, "double submit must reuse one order");
  assert.equal(await db.order.count(), 1);
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: "shaya-bio" } })).stock,
    3,
  );
  assert.equal(a.order.totalCentimes, 600000, "server owns money snapshots");
  await assert.rejects(
    () =>
      createOrder({
        ...input,
        idempotencyKey: randomUUID(),
        expectedUnitPriceCentimes: 1,
      }),
    /PRICE_CHANGED/,
  );
  await assert.rejects(
    () => createOrder({ ...input, quantity: 1 }),
    /KEY_REUSED/,
  );
  await changeOrder(a.order.id, 0, "CANCELED");
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: "shaya-bio" } })).stock,
    5,
  );
  await changeOrder(a.order.id, 1, "CONFIRMED");
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: "shaya-bio" } })).stock,
    3,
  );
  await assert.rejects(
    () => changeOrder(a.order.id, 1, "CANCELED"),
    /CONFLICT/,
  );
  await changeOrder(a.order.id, 2, "DELIVERED");
  await changeOrder(a.order.id, 3, "CANCELED");
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: "shaya-bio" } })).stock,
    5,
    "delivered cancellation returns stock once",
  );
  await changeOrder(a.order.id, 4, "DELETE");
  await changeOrder(a.order.id, 5, "RESTORE");
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: "shaya-bio" } })).stock,
    5,
  );
  assert.equal(
    (await db.order.findUniqueOrThrow({ where: { id: a.order.id } })).status,
    "CANCELED",
  );
  const concurrent = await Promise.allSettled([
    createOrder({ ...input, idempotencyKey: randomUUID(), quantity: 4 }),
    createOrder({ ...input, idempotencyKey: randomUUID(), quantity: 4 }),
  ]);
  assert.equal(
    concurrent.filter((r) => r.status === "fulfilled").length,
    1,
    "cannot oversell concurrent orders",
  );
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: "shaya-bio" } })).stock,
    1,
  );
  await assert.rejects(() => changeOrder(a.order.id, 6, "CONFIRMED"), /STOCK/);
  const delivered = concurrent.find((r) => r.status === "fulfilled");
  if (delivered?.status === "fulfilled") {
    const id = delivered.value.order.id;
    await changeOrder(id, 0, "DELIVERED");
    await changeOrder(id, 1, "DELETE");
    assert.equal(
      (await db.product.findUniqueOrThrow({ where: { id: "shaya-bio" } }))
        .stock,
      1,
      "archiving delivery does not return stock",
    );
    await changeOrder(id, 2, "RESTORE");
    await changeOrder(id, 3, "CONFIRMED");
    await changeOrder(id, 4, "DELIVERED");
    assert.equal(
      await db.integrationEvent.count({
        where: { orderId: id, name: "Purchase" },
      }),
      1,
      "Purchase must be emitted once per order",
    );
  }
  assert.equal(
    (await db.dailyMetric.aggregate({ _sum: { orders: true } }))._sum.orders,
    2,
  );
  assert.equal(await db.adminNotification.count(), 2);
  assert.equal(stockChange("CANCELED", "DELIVERED", 4), -4);
  console.log(
    "PASS: atomic reservation, concurrent checkout, idempotency, totals, transitions, version guard, insufficient stock, trash/restore, notifications, metric rollups",
  );
} finally {
  await db?.$disconnect();
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.end();
}
