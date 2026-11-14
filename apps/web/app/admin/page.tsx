import { requireAdmin } from "@/lib/server/security";
import { dashboardData } from "@/lib/server/admin-data";
import { getPublicProduct } from "@/lib/server/catalog";
import Dashboard from "@/components/admin/dashboard/dashboard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const days = [7, 30, 90].includes(Number(params.days))
    ? Number(params.days)
    : 30;
  const [data, product] = await Promise.all([
    dashboardData(days),
    getPublicProduct(),
  ]);
  return <Dashboard data={data} product={product} days={days} />;
}
