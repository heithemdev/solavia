"use server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import {
  passwordMatches,
  startSession,
  endSession,
  requireAdmin,
  limit,
  requestIp,
  encrypt,
} from "@/lib/server/security";
import { changeOrder } from "@/lib/server/orders";
import {
  invalidateProduct,
  invalidateMetrics,
  PRODUCT_ID,
} from "@/lib/server/catalog";
import { sendMeta } from "@/lib/server/integrations";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/store-types";

export async function login(_previous: { error: string }, form: FormData) {
  let valid = false;
  try {
    await limit("login", await requestIp(), 8, 900);
    const username = String(form.get("username") || ""),
      password = String(form.get("password") || "");
    const matched = await passwordMatches(password);
    valid = matched && username === process.env.ADMIN_USERNAME;
  } catch {
    return {
      error: "Trop de tentatives ou service indisponible. Réessayez plus tard.",
    };
  }
  if (!valid) return { error: "Identifiant ou mot de passe incorrect" };
  await startSession();
  redirect("/admin");
}
export async function logout() {
  await endSession();
  redirect("/admin/login");
}
export async function saveProduct(input: {
  stock: number;
  priceCentimes: number;
  active: boolean;
  version: number | null;
}) {
  await requireAdmin();
  if (
    !Number.isInteger(input.stock) ||
    input.stock < 0 ||
    input.stock > 1000000 ||
    !Number.isInteger(input.priceCentimes) ||
    input.priceCentimes < 100 ||
    input.priceCentimes > 10000000 ||
    typeof input.active !== "boolean"
  )
    return { error: "Vérifiez le prix et le stock" };
  try {
    if (input.version === null)
      await db.product.create({
        data: {
          id: PRODUCT_ID,
          name: "SHAYA BIO",
          stock: input.stock,
          baselineStock: input.stock,
          priceCentimes: input.priceCentimes,
          active: input.active,
        },
      });
    else {
      const changed = await db.product.updateMany({
        where: { id: PRODUCT_ID, version: input.version },
        data: {
          stock: input.stock,
          baselineStock: input.stock,
          priceCentimes: input.priceCentimes,
          active: input.active,
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        return {
          error: "Le stock a changé. Fermez puis rouvrez cette fenêtre",
        };
    }
    invalidateProduct();
    revalidatePath("/admin");
    return { ok: true };
  } catch {
    return { error: "Impossible d’enregistrer le produit" };
  }
}
export async function updateOrder(
  id: string,
  version: number,
  operation: OrderStatus | "DELETE" | "RESTORE",
) {
  await requireAdmin();
  if (
    !/^[a-f0-9-]{36}$/i.test(id) ||
    !Number.isInteger(version) ||
    ![...ORDER_STATUSES, "DELETE", "RESTORE"].includes(operation)
  )
    return { error: "Action invalide" };
  try {
    const eventId = await changeOrder(id, version, operation);
    invalidateProduct();
    invalidateMetrics();
    revalidatePath("/admin");
    if (eventId)
      after(() =>
        sendMeta(eventId, process.env.SITE_URL || "https://solavia.store"),
      );
    return { ok: true };
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message === "STOCK"
          ? "Stock insuffisant pour réactiver cette commande"
          : "Cette commande a changé. Actualisez la page",
    };
  }
}
export async function savePixel(input: {
  pixelId: string;
  token: string;
  removeToken: boolean;
}) {
  await requireAdmin();
  if (
    !input ||
    typeof input.pixelId !== "string" ||
    typeof input.token !== "string" ||
    (!/^\d{5,30}$/.test(input.pixelId) && input.pixelId !== "") ||
    input.token.length > 10000
  )
    return { error: "Identifiant Pixel invalide" };
  const data = {
    pixelId: input.pixelId || null,
    ...(input.removeToken
      ? { encryptedToken: null }
      : input.token.trim()
        ? { encryptedToken: encrypt(input.token.trim()) }
        : {}),
  };
  await db.metaSettings.upsert({
    where: { id: "solavia" },
    create: { id: "solavia", ...data },
    update: data,
  });
  revalidateTag("solavia-pixel", { expire: 0 });
  revalidatePath("/admin/pixel");
  return { ok: true };
}
export async function savePush(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const session = await requireAdmin();
  try {
    const url = new URL(input.endpoint);
    const allowed =
      url.hostname === "fcm.googleapis.com" ||
      url.hostname.endsWith(".push.services.mozilla.com") ||
      url.hostname === "updates.push.services.mozilla.com" ||
      url.hostname.endsWith(".notify.windows.com") ||
      url.hostname === "web.push.apple.com";
    if (
      url.protocol !== "https:" ||
      url.port ||
      !allowed ||
      input.endpoint.length > 1024 ||
      !/^[A-Za-z0-9_-]{80,100}$/.test(input.keys.p256dh) ||
      !/^[A-Za-z0-9_-]{20,30}$/.test(input.keys.auth)
    )
      throw new Error();
    await db.adminPushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        authSecret: input.keys.auth,
        sessionHash: session.tokenHash,
      },
      update: {
        p256dh: input.keys.p256dh,
        authSecret: input.keys.auth,
        sessionHash: session.tokenHash,
      },
    });
    return { ok: true };
  } catch {
    return { error: "Impossible d’activer les notifications sur cet appareil" };
  }
}
export async function removePush(endpoint: string) {
  const session = await requireAdmin();
  await db.adminPushSubscription.deleteMany({
    where: { endpoint, sessionHash: session.tokenHash },
  });
  return { ok: true };
}
