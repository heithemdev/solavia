import Solvia from "@/components/products/solvia";
import StorefrontProvider from "@/components/products/storefront-provider";
import { getPublicProduct, getPublicPixel } from "@/lib/server/catalog";

export const revalidate = 30;

export default async function Page() {
  const [product, pixelId] = await Promise.all([getPublicProduct(), getPublicPixel()]);
  return <><link rel="preload" as="image" href="/images/solavia/hero/hero-forest-texture.webp" /><StorefrontProvider initialProduct={product} initialPixelId={pixelId}><Solvia /></StorefrontProvider></>;
}
