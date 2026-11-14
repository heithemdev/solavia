import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { db } from "@/lib/db";
import wilayas from "@/lib/data/algeria-58.json";
import { getDeliveryPrice } from "@/lib/delivery-prices";
import {
  normalizeSearch,
  stockChange,
  algeriaDay,
  PRODUCT_ID,
} from "@/lib/order-policy";
import { isAlgerianMobile, normalizePhone } from "@/lib/solavia-order";
import type { CheckoutInput, OrderStatus, Receipt } from "@/lib/store-types";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

type StoredReceipt = {
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
        const product = await tx.product.findUnique({
          where: { id: PRODUCT_ID },
        });
        if (!product?.active) throw new Error("UNAVAILABLE");
        if (product.priceCentimes !== input.expectedUnitPriceCentimes)
          throw new Error("PRICE_CHANGED");
        const reserved = await tx.product.updateMany({
          where: {
            id: PRODUCT_ID,
            stock: { gte: quantity },
            priceCentimes: product.priceCentimes,
            active: true,
          },
          data: { stock: { decrement: quantity }, version: { increment: 1 } },
        });
        if (!reserved.count) throw new Error("STOCK");
        const subtotal = product.priceCentimes * quantity;
        const order = await tx.order.create({
          data: {
            reference: randomUUID(),
            idempotencyKey: input.idempotencyKey,
            requestHash,
            productId: PRODUCT_ID,
            quantity,
            productName: product.name,
            unitPriceCentimes: product.priceCentimes,
            subtotalCentimes: subtotal,
            deliveryPriceCentimes: shipping * 100,
            totalCentimes: subtotal + shipping * 100,
            firstName,
            lastName,
            phone,
            customerSearch: normalizeSearch(
              `${lastName} ${firstName} ${phone}`,
            ),
            deliveryMode: input.deliveryMode,
            wilayaCode: wilaya.code,
            wilayaName: wilaya.name,
            communeId: commune.id,
            communeName: commune.name,
            address,
            trackingConsent: input.trackingConsent === true,
            fbp:
              input.trackingConsent && typeof input.fbp === "string"
                ? input.fbp.slice(0, 150)
                : null,
            fbc:
              input.trackingConsent && typeof input.fbc === "string"
                ? input.fbc.slice(0, 200)
                : null,
          },
        });
        order.reference = `SOL-${String(order.number).padStart(6, "0")}`;
        await tx.order.update({
          where: { id: order.id },
          data: { reference: order.reference },
        });
        await tx.dailyMetric.upsert({
          where: { day: algeriaDay() },
          create: {
            day: algeriaDay(),
            orders: 1,
            revenueCentimes: BigInt(subtotal),
          },
          update: {
            orders: { increment: 1 },
            revenueCentimes: { increment: BigInt(subtotal) },
          },
        });
        await tx.adminNotification.create({ data: { orderId: order.id } });
        if (order.trackingConsent)
          await tx.integrationEvent.create({
            data: {
              id: `${order.id}:placed`,
              name: "OrderPlaced",
              orderId: order.id,
            },
          });
        return { order, created: true };
      },
      { maxWait: 5000, timeout: 10000 },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
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
  operation: OrderStatus | "DELETE" | "RESTORE",
) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order || order.version !== version) throw new Error("CONFLICT");
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
    const delta = stockChange(order.status, next, order.quantity);
    const changed = await tx.order.updateMany({
      where: { id, version },
      data: {
        status: next,
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
