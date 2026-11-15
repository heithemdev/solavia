import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import type { ProductInfo } from "@/lib/store-types";

import { PRODUCT_ID } from "@/lib/order-policy";
export { PRODUCT_ID, algeriaDay } from "@/lib/order-policy";
export async function getPublicProduct(): Promise<ProductInfo | null> {
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
  return product;
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
