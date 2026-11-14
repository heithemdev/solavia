import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET || "",
    actual =
      request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (
    !expected ||
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return new Response("Unauthorized", { status: 401 });
  const now = new Date(),
    older = new Date(Date.now() - 30 * 86400000);
  const counts = await db.$transaction([
    db.order.deleteMany({ where: { deletedAt: { lt: older } } }),
    db.adminSession.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.visitDedup.deleteMany({
      where: { day: { lt: new Date(Date.now() - 90 * 86400000) } },
    }),
  ]);
  await db.integrationEvent.deleteMany({
    where: {
      orderId: null,
      createdAt: { lt: new Date(Date.now() - 90 * 86400000) },
    },
  });
  return Response.json({ purged: counts[0].count });
}
