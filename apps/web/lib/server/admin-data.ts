import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { algeriaDay, getPublicProduct } from "./catalog";
import destinations from "@/lib/data/algeria-fr.json";
import { receiptOf } from "./orders";
import { normalizeSearch } from "@/lib/order-policy";
import { ORDER_STATUSES, type OrderRow } from "@/lib/store-types";

export const dashboardData = unstable_cache(
  async (days: number) => {
    const end = algeriaDay(),
      start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);
    const [metrics, all] = await Promise.all([
      db.dailyMetric.findMany({
        where: { day: { gte: start, lte: end } },
        orderBy: { day: "asc" },
      }),
      db.dailyMetric.aggregate({
        _sum: { orders: true, revenueCentimes: true },
      }),
    ]);
    const daily = Array.from({ length: days }, (_, i) => {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + i);
      const m = metrics.find((row) => row.day.getTime() === day.getTime());
      return {
        day: day.toISOString().slice(0, 10),
        orders: m?.orders || 0,
        revenue: Number(m?.revenueCentimes || 0),
        visits: m?.visits || 0,
      };
    });
    return {
      daily,
      totalOrders: all._sum.orders || 0,
      totalRevenue: Number(all._sum.revenueCentimes || 0),
    };
  },
  ["dashboard-metrics"],
  { revalidate: 30, tags: ["solavia-metrics"] },
);

export async function ordersData(params: Record<string, string | undefined>) {
  const status = ORDER_STATUSES.find((s) => s === params.status);
  const trash = params.tab === "trash";
  const search = normalizeSearch((params.q || "").slice(0, 80));
  const range = ["7", "30", "90"].includes(params.days || "")
    ? Number(params.days)
    : null;
  const filter = {
    deletedAt: trash ? { not: null } : null,
    ...(status ? { status } : {}),
    ...(params.mode === "HOME" || params.mode === "DESK"
      ? { deliveryMode: params.mode as "HOME" | "DESK" }
      : {}),
    ...(range
      ? { createdAt: { gte: new Date(Date.now() - range * 86400000) } }
      : {}),
    ...(search
      ? {
          OR: [
            { customerSearch: { contains: search } },
            { reference: { contains: search.toUpperCase() } },
          ],
        }
      : {}),
  };
  const sort = params.sort === "oldest" ? "asc" : "desc";
  let cursor: { id: string; createdAt: string; status: string } | null = null;
  try {
    const c = JSON.parse(
      Buffer.from(params.cursor || "", "base64url").toString(),
    );
    if (
      typeof c.id === "string" &&
      /^[a-f0-9-]{36}$/i.test(c.id) &&
      !isNaN(Date.parse(c.createdAt))
    )
      cursor = c;
  } catch {}
  const seek = (direction: "asc" | "desc") =>
    cursor
      ? {
          OR: [
            {
              createdAt:
                direction === "asc"
                  ? { gt: new Date(cursor.createdAt) }
                  : { lt: new Date(cursor.createdAt) },
            },
            {
              createdAt: new Date(cursor.createdAt),
              id: direction === "asc" ? { gt: cursor.id } : { lt: cursor.id },
            },
          ],
        }
      : {};
  const stockPromise = getPublicProduct();
  let rows;
  if (!params.sort || params.sort === "priority") {
    const freshPromise =
      cursor && cursor.status !== "NEW"
        ? Promise.resolve([])
        : db.order.findMany({
            where: { AND: [filter, { status: "NEW" }, seek("asc")] },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: 26,
          });
    const otherPromise = db.order.findMany({
      where: {
        AND: [
          filter,
          { status: { not: "NEW" } },
          ...(cursor?.status !== "NEW" ? [seek("desc")] : []),
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 26,
    });
    const [fresh, other] = await Promise.all([freshPromise, otherPromise]);
    rows = [...fresh, ...other].slice(0, 26);
  } else
    rows = await db.order.findMany({
      where: { AND: [filter, seek(sort)] },
      orderBy: [{ createdAt: sort }, { id: sort }],
      take: 26,
    });
  const more = rows.length > 25;
  rows = rows.slice(0, 25);
  const last = rows.at(-1);
  const product = await stockPromise;
  return {
    orders: rows.map((row) => ({
      ...receiptOf(row),
      wilayaName:
        (destinations as Record<string, { wilaya: string; commune: string }>)[
          row.communeId
        ]?.wilaya || row.wilayaName,
      communeName:
        (destinations as Record<string, { wilaya: string; commune: string }>)[
          row.communeId
        ]?.commune || row.communeName,
      id: row.id,
      status: row.status,
      version: row.version,
      deletedAt: row.deletedAt?.toISOString() || null,
    })) as OrderRow[],
    next:
      more && last
        ? Buffer.from(
            JSON.stringify({
              id: last.id,
              createdAt: last.createdAt.toISOString(),
              status: last.status,
            }),
          ).toString("base64url")
        : null,
    stock: product?.stock ?? 0,
    baseline: product?.baselineStock ?? 0,
  };
}
