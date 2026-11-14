import { requireAdmin } from "@/lib/server/security";
import { db } from "@/lib/db";
import Pixel from "@/components/admin/pixel/pixel";
export default async function Page() {
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
