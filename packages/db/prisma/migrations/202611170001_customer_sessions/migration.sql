-- Preserve historical customer numbers; new sessions receive new numbers.
ALTER TABLE "Customer" ADD COLUMN "sessionKey" VARCHAR(64) NOT NULL DEFAULT 'legacy';
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_pkey";
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (phone, "sessionKey");
