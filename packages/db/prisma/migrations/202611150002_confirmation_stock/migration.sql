ALTER TABLE "Order" ADD COLUMN "stockReserved" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Order" SET "stockReserved"=true WHERE status IN ('CONFIRMED','DELIVERED');
-- The admin's current inventory remains authoritative; NEW orders no longer reserve it.
UPDATE "DailyMetric" SET "revenueCentimes"=0;
INSERT INTO "DailyMetric" (day,orders,"revenueCentimes",visits)
SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Algiers')::date,0,SUM("subtotalCentimes"),0
FROM "Order" WHERE status IN ('CONFIRMED','DELIVERED') GROUP BY 1
ON CONFLICT(day) DO UPDATE SET "revenueCentimes"=EXCLUDED."revenueCentimes";
