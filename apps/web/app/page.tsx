import Solvia from "@/components/products/solvia";
import StorefrontProvider from "@/components/products/storefront-provider";

export default function Page() {
  return <><link rel="preload" as="image" href="/images/solavia/hero/hero-forest-texture.webp" /><StorefrontProvider><Solvia /></StorefrontProvider></>;
}
