CREATE TABLE "Customer" (
  "phone" VARCHAR(10) NOT NULL PRIMARY KEY,
  "number" INTEGER NOT NULL UNIQUE
);
INSERT INTO "Customer" ("phone","number")
SELECT phone, ROW_NUMBER() OVER (ORDER BY first_order)::integer
FROM (SELECT phone, MIN(number) AS first_order FROM "Order" GROUP BY phone) customers;
ALTER TABLE "Order" ADD COLUMN "customerNumber" INTEGER;
UPDATE "Order" SET "customerNumber" = "Customer".number FROM "Customer" WHERE "Order".phone = "Customer".phone;
ALTER TABLE "Order" ALTER COLUMN "customerNumber" SET NOT NULL;
