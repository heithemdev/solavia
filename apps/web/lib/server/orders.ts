import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { db } from "@/lib/db";
import wilayas from "@/lib/data/algeria-58.json";
import { getDeliveryPrice } from "@/lib/delivery-prices";
import { normalizeSearch, algeriaDay, PRODUCT_ID } from "@/lib/order-policy";
import { isAlgerianMobile, normalizePhone } from "@/lib/solavia-order";
import type { CheckoutInput, OrderStatus, Receipt } from "@/lib/store-types";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

type StoredReceipt = {
  customerNumber: number;
  reference: string;
  number: number;
  lastName: string;
  firstName: string;
  phone: string;
  quantity: number;
  unitPriceCentimes: number;
  subtotalCentimes: number;
  deliveryPriceCentimes: number;
  totalCentimes: number;
  deliveryMode: "HOME" | "DESK";
  wilayaName: string;
  communeName: string;
  createdAt: Date;
};
export function receiptOf(order: StoredReceipt): Receipt {
  return {
    customerNumber: order.customerNumber,
    reference: order.reference,
    number: order.number,
    fullName: `${order.lastName} ${order.firstName}`,
    phone: order.phone,
    quantity: order.quantity,
    unitPriceCentimes: order.unitPriceCentimes,
    subtotalCentimes: order.subtotalCentimes,
    deliveryPriceCentimes: order.deliveryPriceCentimes,
    totalCentimes: order.totalCentimes,
    deliveryMode: order.deliveryMode,
    wilayaName: order.wilayaName,
    communeName: order.communeName,
    createdAt: order.createdAt.toISOString(),
  };
}
export async function createOrder(input: CheckoutInput) {
  if (
    !input ||
    typeof input.idempotencyKey !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(input.idempotencyKey)
  )
    throw new Error("INVALID");
  const firstName =
    typeof input.firstName === "string" ? input.firstName.trim() : "";
  const lastName =
    typeof input.lastName === "string" ? input.lastName.trim() : "";
  const phone =
    typeof input.phone === "string" ? normalizePhone(input.phone) : "";
  const quantity = input.quantity;
  const wilaya = wilayas.find((w) => w.code === input.wilayaCode);
  const commune = wilaya?.communes.find((c) => c.id === input.communeId);
  if (
    !firstName ||
    firstName.length > 60 ||
    !lastName ||
    lastName.length > 60 ||
    !isAlgerianMobile(phone) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99 ||
    !wilaya ||
    !commune ||
    !["HOME", "DESK"].includes(input.deliveryMode)
  )
    throw new Error("INVALID");
  const shipping = getDeliveryPrice(
    wilaya.code,
    input.deliveryMode === "HOME" ? "home" : "desk",
  );
  if (shipping === null) throw new Error("DELIVERY");
  const address =
    typeof input.address === "string"
      ? input.address.trim().slice(0, 200)
      : null;
  const requestHash = hash(
    JSON.stringify([
      firstName,
      lastName,
      phone,
      quantity,
      wilaya.code,
      commune.id,
      input.deliveryMode,
      input.expectedUnitPriceCentimes,
      address,
    ]),
  );
  const existing = await db.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    if (existing.requestHash !== requestHash) throw new Error("KEY_REUSED");
    return { order: existing, created: false };
  }
  try {
    return await db.$transaction(
      async (tx) => {
        const products = await tx.$queryRaw<
          import("@/lib/store-types").ProductInfo[]
        >`SELECT id,name,stock,"baselineStock","priceCentimes",active,version FROM "Product" WHERE id=${PRODUCT_ID} FOR UPDATE`;
        const product = products[0];
        if (!product?.active) throw new Error("UNAVAILABLE");
        if (product.priceCentimes !== input.expectedUnitPriceCentimes)
          throw new Error("PRICE_CHANGED");
        if (product.stock < quantity) throw new Error("STOCK");
        const id = randomUUID(),
          notificationId = randomUUID(),
          day = algeriaDay(),
          subtotal = product.priceCentimes * quantity;
        const consent = input.trackingConsent === true;
        const fbp =
          consent && typeof input.fbp === "string"
            ? input.fbp.slice(0, 150)
            : null;
        const fbc =
          consent && typeof input.fbc === "string"
            ? input.fbc.slice(0, 200)
            : null;
        type DbOrder = Awaited<ReturnType<typeof db.order.findUniqueOrThrow>>;
        // NEW orders validate availability but reserve inventory only on confirmation.
        const saved = await tx.$queryRaw<{ order: DbOrder }[]>`
          WITH reserved AS (
            SELECT id FROM "Product" WHERE id=${PRODUCT_ID}
          ), customer AS (
            INSERT INTO "Customer" (phone,number)
            SELECT ${phone},COALESCE(MAX(number),0)+1 FROM "Customer"
            WHERE EXISTS(SELECT 1 FROM reserved)
            ON CONFLICT (phone) DO UPDATE SET phone=EXCLUDED.phone RETURNING number
          ), allocated AS (
            SELECT nextval(pg_get_serial_sequence('"Order"','number'))::integer AS number
          ), inserted AS (
            INSERT INTO "Order" (id,number,reference,"idempotencyKey","requestHash","productId",quantity,"productName","unitPriceCentimes","subtotalCentimes","deliveryPriceCentimes","totalCentimes",currency,"customerSearch","firstName","lastName",phone,"deliveryMode","wilayaCode","wilayaName","communeId","communeName",address,"trackingConsent",fbp,fbc,"customerNumber","updatedAt")
            SELECT ${id}::uuid,allocated.number,'SOL-'||lpad(allocated.number::text,6,'0'),${input.idempotencyKey},${requestHash},${PRODUCT_ID},${quantity},${product.name},${product.priceCentimes},${subtotal},${shipping * 100},${subtotal + shipping * 100},'DZD',${normalizeSearch(`${lastName} ${firstName} ${phone}`)},${firstName},${lastName},${phone},${input.deliveryMode}::"DeliveryMode",${wilaya.code},${wilaya.name},${commune.id},${commune.name},${address},${consent},${fbp},${fbc},customer.number,NOW()
            FROM customer,allocated RETURNING *
          ), metric AS (
            INSERT INTO "DailyMetric" (day,orders,"revenueCentimes",visits)
            SELECT ${day}::date,1,0::bigint,0 FROM inserted
            ON CONFLICT(day) DO UPDATE SET orders="DailyMetric".orders+1,"revenueCentimes"="DailyMetric"."revenueCentimes"+EXCLUDED."revenueCentimes"
          ), notification AS (
            INSERT INTO "AdminNotification" (id,"orderId") SELECT ${notificationId}::uuid,id FROM inserted
          ), event AS (
            INSERT INTO "IntegrationEvent" (id,name,"orderId") SELECT id::text||':placed','OrderPlaced',id FROM inserted WHERE "trackingConsent"=true
          ) SELECT to_jsonb(inserted) AS "order" FROM inserted`;
        const order = saved[0]!.order;
        order.createdAt = new Date(order.createdAt);
        return {
          order,
          created: true,
          product: {
            ...product,
            stock: product.stock,
            version: product.version,
          },
        };
      },
      { maxWait: 5000, timeout: 10000 },
    );
  } catch (error) {
    const failure = error as {
      code?: string;
      meta?: {
        code?: string;
        driverAdapterError?: { cause?: { originalCode?: string } };
      };
    };
    if (
      failure.code === "P2002" ||
      (failure.code === "P2010" &&
        (failure.meta?.code === "23505" ||
          failure.meta?.driverAdapterError?.cause?.originalCode === "23505"))
    ) {
      const order = await db.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (order?.requestHash === requestHash) return { order, created: false };
    }
    throw error;
  }
}

export async function changeOrder(
  id: string,
  version: number,
  operation: OrderStatus | "DELETE" | "RESTORE" | "PURGE",
) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order || order.version !== version) throw new Error("CONFLICT");
    if (operation === "PURGE") {
      if (!order.deletedAt) throw new Error("CONFLICT");
      const removed = await tx.order.deleteMany({
        where: { id, version, deletedAt: { not: null } },
      });
      if (!removed.count) throw new Error("CONFLICT");
      return null;
    }
    if (operation === "RESTORE") {
      if (!order.deletedAt) return null;
      const restored = await tx.order.updateMany({
        where: { id, version },
        data: { deletedAt: null, version: { increment: 1 } },
      });
      if (!restored.count) throw new Error("CONFLICT");
      return null;
    }
    if (order.deletedAt) throw new Error("CONFLICT");
    const next =
      operation === "DELETE"
        ? order.status === "DELIVERED"
          ? "DELIVERED"
          : "CANCELED"
        : operation;
    const reserve = next === "CONFIRMED" || next === "DELIVERED";
    const delta =
      (Number(order.stockReserved) - Number(reserve)) * order.quantity;
    const changed = await tx.order.updateMany({
      where: { id, version },
      data: {
        status: next,
        stockReserved: reserve,
        version: { increment: 1 },
        deletedAt: operation === "DELETE" ? new Date() : null,
        stockRestoredAt:
          next === "CANCELED" ? order.stockRestoredAt || new Date() : null,
      },
    });
    if (!changed.count) throw new Error("CONFLICT");
    if (delta < 0) {
      const reserved = await tx.product.updateMany({
        where: { id: order.productId, stock: { gte: -delta } },
        data: { stock: { increment: delta }, version: { increment: 1 } },
      });
      if (!reserved.count) throw new Error("STOCK");
    } else if (delta > 0)
      await tx.product.update({
        where: { id: order.productId },
        data: { stock: { increment: delta }, version: { increment: 1 } },
      });
    const wasSale =
      order.status === "CONFIRMED" || order.status === "DELIVERED";
    const revenueDelta =
      (Number(reserve) - Number(wasSale)) * order.subtotalCentimes;
    if (revenueDelta) {
      const day = algeriaDay(order.createdAt);
      await tx.dailyMetric.upsert({
        where: { day },
        create: { day, revenueCentimes: BigInt(revenueDelta) },
        update: { revenueCentimes: { increment: BigInt(revenueDelta) } },
      });
    }
    if (
      order.status !== next &&
      order.trackingConsent &&
      (next === "DELIVERED" || next === "CANCELED")
    ) {
      const eventId =
        next === "DELIVERED"
          ? `${id}:purchase`
          : `${id}:canceled:${version + 1}`;
      const event = await tx.integrationEvent.createMany({
        data: [
          {
            id: eventId,
            name: next === "DELIVERED" ? "Purchase" : "OrderCanceled",
            orderId: id,
          },
        ],
        skipDuplicates: true,
      });
      return event.count ? eventId : null;
    }
    return null;
  });
}
