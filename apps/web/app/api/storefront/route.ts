import { getPublicProduct, getPublicPixel } from "@/lib/server/catalog";
export async function GET() {
  try {
    const [product, pixelId] = await Promise.all([
      getPublicProduct(),
      getPublicPixel(),
    ]);
    return Response.json(
      { product, pixelId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Store unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
