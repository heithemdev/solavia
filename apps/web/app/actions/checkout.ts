"use server";
import { after } from "next/server";
import { headers } from "next/headers";
import { createOrder, receiptOf } from "@/lib/server/orders";
import {
  getPublicProduct,
  invalidateProduct,
  invalidateMetrics,
} from "@/lib/server/catalog";
import { limit, requestIp } from "@/lib/server/security";
import { notifyOrder, sendMeta } from "@/lib/server/integrations";
import type { CheckoutInput, CheckoutResult } from "@/lib/store-types";

export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  try {
    await limit("checkout", await requestIp(), 12, 600);
    const result = await createOrder(input);
    invalidateProduct();
    invalidateMetrics();
    const origin = (await headers()).get("origin") || "https://solavia.store";
    if (result.created)
      after(async () => {
        await Promise.allSettled([
          notifyOrder(result.order.id),
          sendMeta(`${result.order.id}:placed`, origin),
        ]);
      });
    return {
      ok: true,
      receipt: receiptOf(result.order),
      product: await getPublicProduct(),
      eventId: `${result.order.id}:placed`,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const messages: Record<string, string> = {
      INVALID: "تحقق من بيانات الطلب",
      DELIVERY: "طريقة التوصيل غير متاحة",
      STOCK: "الكمية المطلوبة غير متوفرة حاليًا",
      PRICE_CHANGED: "تغيّر السعر، راجع الإجمالي ثم أكد طلبك",
      UNAVAILABLE: "المنتج غير متاح للطلب حاليًا",
      KEY_REUSED: "تغيّرت بيانات الطلب، حاول مجددًا",
      RATE_LIMIT: "طلبات كثيرة، يرجى الانتظار قليلًا",
    };
    if (["STOCK", "PRICE_CHANGED", "UNAVAILABLE"].includes(code))
      invalidateProduct();
    return {
      ok: false,
      code: messages[code] ? code : "UNKNOWN",
      message:
        messages[code] || "تعذر حفظ الطلب الآن، حاول مجددًا بنفس البيانات",
      ...(["STOCK", "PRICE_CHANGED", "UNAVAILABLE"].includes(code)
        ? { product: await getPublicProduct().catch(() => null) }
        : {}),
    };
  }
}
