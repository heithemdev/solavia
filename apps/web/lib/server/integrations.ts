import "server-only";
import * as webpush from "web-push";
import { db } from "@/lib/db";
import { decrypt, hash } from "./security";

export async function notifyOrder(orderId: string) {
  if (
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  )
    return;
  const claimed = await db.adminNotification.updateMany({
    where: { orderId, attempts: 0 },
    data: { attempts: 1 },
  });
  if (!claimed.count) return;
  const notification = await db.adminNotification.findUnique({
    where: { orderId },
    include: { order: true },
  });
  if (!notification) return;
  const subscriptions = await db.adminPushSubscription.findMany({
    where: { session: { expiresAt: { gt: new Date() }, revokedAt: null } },
    take: 20,
  });
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const delivery = await db.pushDelivery.create({
        data: { notificationId: notification.id, subscriptionId: sub.id },
      });
      try {
        const order = notification.order;
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.authSecret },
          },
          JSON.stringify({
            id: notification.id,
            title: `Nouvelle commande ${order.reference}`,
            body: `${order.lastName} ${order.firstName} · ${order.quantity} flacon${order.quantity > 1 ? "s" : ""}`,
            url: "/admin/orders",
          }),
          {
            TTL: 300,
            timeout: 4000,
            vapidDetails: {
              subject: process.env.VAPID_SUBJECT || "https://solavia.store",
              publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
              privateKey: process.env.VAPID_PRIVATE_KEY!,
            },
          },
        );
        await db.pushDelivery.update({
          where: { id: delivery.id },
          data: { sentAt: new Date() },
        });
      } catch (error) {
        const code = (error as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410)
          await db.adminPushSubscription.deleteMany({ where: { id: sub.id } });
        else
          await db.pushDelivery.update({
            where: { id: delivery.id },
            data: { lastError: `Push failed (${code || "network"})` },
          });
        throw new Error("Push failed");
      }
    }),
  );
  const failures = results.filter((r) => r.status === "rejected").length;
  await db.adminNotification.update({
    where: { id: notification.id },
    data: {
      sentAt: failures ? null : new Date(),
      lastError: failures ? `${failures} delivery failure(s)` : null,
    },
  });
}

export async function sendMeta(
  eventId: string,
  origin: string,
  anonymous?: Record<string, unknown>,
) {
  const settings = await db.metaSettings.findUnique({
    where: { id: "solavia" },
  });
  if (!settings?.pixelId || !settings.encryptedToken) return;
  const claimed = await db.integrationEvent.updateMany({
    where: { id: eventId, state: "PENDING" },
    data: { state: "PROCESSING", attempts: { increment: 1 } },
  });
  if (!claimed.count) return;
  const event = await db.integrationEvent.findUnique({
    where: { id: eventId },
    include: { order: true },
  });
  if (!event) return;
  try {
    const order = event.order;
    const user_data = order
      ? {
          ph: [hash(`213${order.phone.slice(1)}`)],
          fn: [hash(order.firstName.toLowerCase().trim())],
          ln: [hash(order.lastName.toLowerCase().trim())],
          country: [hash("dz")],
          ...(order.fbp ? { fbp: order.fbp } : {}),
          ...(order.fbc ? { fbc: order.fbc } : {}),
        }
      : anonymous || {};
    const payload = {
      event_name: event.name,
      event_time: Math.floor(event.createdAt.getTime() / 1000),
      event_id: event.id,
      action_source: "website",
      event_source_url: origin,
      user_data,
      custom_data: order
        ? {
            currency: "DZD",
            value: order.subtotalCentimes / 100,
            content_ids: [order.productId],
            content_type: "product",
            num_items: order.quantity,
          }
        : undefined,
    };
    const version = /^v\d+\.\d+$/.test(process.env.META_API_VERSION || "")
      ? process.env.META_API_VERSION
      : "v25.0";
    const response = await fetch(
      `https://graph.facebook.com/${version}/${settings.pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [payload],
          access_token: decrypt(settings.encryptedToken),
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) throw new Error(`Meta HTTP ${response.status}`);
    await db.integrationEvent.update({
      where: { id: event.id },
      data: { state: "SENT", sentAt: new Date(), lastError: null },
    });
  } catch (error) {
    await db.integrationEvent.update({
      where: { id: event.id },
      data: {
        state: "FAILED",
        lastError:
          error instanceof Error && /^Meta HTTP/.test(error.message)
            ? error.message
            : "Meta delivery failed",
      },
    });
  }
}
