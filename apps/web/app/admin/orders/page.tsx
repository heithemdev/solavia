import { requireAdmin } from "@/lib/server/security";
import { ordersData } from "@/lib/server/admin-data";
import Orders from "@/components/admin/orders/orders";
import { Suspense } from "react";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<Orders />}>
      <Content params={params} />
    </Suspense>
  );
}
async function Content({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  await requireAdmin();
  const data = await ordersData(params);
  return <Orders {...data} />;
}
