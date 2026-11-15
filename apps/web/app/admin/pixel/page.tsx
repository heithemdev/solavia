import { requireAdmin } from "@/lib/server/security";
import { db } from "@/lib/db";
import Pixel from "@/components/admin/pixel/pixel";
import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<Pixel pixelId="" hasToken={false} loading />}>
      <Content />
    </Suspense>
  );
}
async function Content() {
  await requireAdmin();
  const settings = await db.metaSettings.findUnique({
    where: { id: "solavia" },
    select: { pixelId: true, encryptedToken: true },
  });
  return (
    <Pixel
      pixelId={settings?.pixelId || ""}
      hasToken={Boolean(settings?.encryptedToken)}
    />
  );
}
