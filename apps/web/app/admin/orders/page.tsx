import { requireAdmin } from "@/lib/server/security";
import { ordersData } from "@/lib/server/admin-data";
import Orders from "@/components/admin/orders/orders";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const data = await ordersData(await searchParams);
  return <Orders {...data} />;
}
