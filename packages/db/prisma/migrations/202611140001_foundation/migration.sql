-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'CONFIRMED', 'CANCELED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('HOME', 'DESK');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCentimes" INTEGER NOT NULL,
    "baselineStock" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPriceCentimes" INTEGER NOT NULL,
    "subtotalCentimes" INTEGER NOT NULL,
    "deliveryPriceCentimes" INTEGER NOT NULL,
    "totalCentimes" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "customerSearch" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" VARCHAR(10) NOT NULL,
    "deliveryMode" "DeliveryMode" NOT NULL,
    "wilayaCode" TEXT NOT NULL,
    "wilayaName" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "communeName" TEXT NOT NULL,
    "address" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "version" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "trackingConsent" BOOLEAN NOT NULL DEFAULT false,
    "fbp" TEXT,
    "fbc" TEXT,
    "adminNote" TEXT,
    "stockRestoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "AdminPushSubscription" (
    "id" UUID NOT NULL,
    "endpoint" VARCHAR(1024) NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "authSecret" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDelivery" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaSettings" (
    "id" TEXT NOT NULL DEFAULT 'solavia',
    "pixelId" TEXT,
    "encryptedToken" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderId" UUID,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "day" DATE NOT NULL,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenueCentimes" BIGINT NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "VisitDedup" (
    "day" DATE NOT NULL,
    "sessionHash" TEXT NOT NULL,

    CONSTRAINT "VisitDedup_pkey" PRIMARY KEY ("day","sessionHash")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_deletedAt_status_createdAt_id_idx" ON "Order"("deletedAt", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Order_createdAt_id_idx" ON "Order"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Order_phone_idx" ON "Order"("phone");

-- CreateIndex
CREATE INDEX "Order_wilayaCode_idx" ON "Order"("wilayaCode");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPushSubscription_endpoint_key" ON "AdminPushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "AdminNotification_orderId_key" ON "AdminNotification"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PushDelivery_notificationId_subscriptionId_key" ON "PushDelivery"("notificationId", "subscriptionId");

-- CreateIndex
CREATE INDEX "IntegrationEvent_state_createdAt_idx" ON "IntegrationEvent"("state", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPushSubscription" ADD CONSTRAINT "AdminPushSubscription_sessionHash_fkey" FOREIGN KEY ("sessionHash") REFERENCES "AdminSession"("tokenHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "AdminNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDelivery" ADD CONSTRAINT "PushDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "AdminPushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "product_values" CHECK (id = 'shaya-bio' AND stock >= 0 AND "baselineStock" >= 0 AND "priceCentimes" BETWEEN 100 AND 10000000);
ALTER TABLE "Order" ADD CONSTRAINT "order_values" CHECK (quantity BETWEEN 1 AND 99 AND "unitPriceCentimes" > 0 AND "deliveryPriceCentimes" >= 0 AND "subtotalCentimes" = quantity * "unitPriceCentimes" AND "totalCentimes" = "subtotalCentimes" + "deliveryPriceCentimes" AND phone ~ '^0[567][0-9]{8}$' AND currency = 'DZD');
CREATE INDEX "Order_customerSearch_trgm" ON "Order" USING GIN ("customerSearch" gin_trgm_ops);
CREATE INDEX "AdminPushSubscription_sessionHash_idx" ON "AdminPushSubscription" ("sessionHash");
