import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import type { ProductInfo } from "@/lib/store-types";

import { PRODUCT_ID } from "@/lib/order-policy";
export { PRODUCT_ID, algeriaDay } from "@/lib/order-policy";
const cachedProduct = unstable_cache(
  async (): Promise<ProductInfo> => {
    const product = await db.product.findUnique({
      where: { id: PRODUCT_ID },
      select: {
        id: true,
        name: true,
        stock: true,
        baselineStock: true,
        priceCentimes: true,
        active: true,
        version: true,
      },
    });
    if (!product) throw new Error("PRODUCT_NOT_CONFIGURED");
    return product;
  },
  ["solavia-product-v2"],
  { revalidate: 30, tags: ["solavia-product"] },
);
export async function getPublicProduct(): Promise<ProductInfo | null> {
  try {
    return await cachedProduct();
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_CONFIGURED")
      return null;
    throw error;
  }
}
export const getPublicPixel = unstable_cache(
  async () => {
    const settings = await db.metaSettings.findUnique({
      where: { id: "solavia" },
      select: { pixelId: true },
    });
    return settings?.pixelId || null;
  },
  ["solavia-pixel"],
  { revalidate: 300, tags: ["solavia-pixel"] },
);
export function invalidateProduct() {
  revalidateTag("solavia-product", { expire: 0 });
}
export function invalidateMetrics() {
  revalidateTag("solavia-metrics", { expire: 0 });
}
