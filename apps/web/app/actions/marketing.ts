"use server";
import { after } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { limit, requestIp, hash } from "@/lib/server/security";
import { sendMeta } from "@/lib/server/integrations";
export async function pageView(eventId: string, fbp?: string, fbc?: string) {
  if (!/^page:[a-f0-9-]{36}$/i.test(eventId)) return;
  try {
    const ip = await requestIp();
    await limit("pixel-page", ip, 60, 3600);
    const result = await db.integrationEvent.createMany({
      data: [{ id: eventId, name: "PageView" }],
      skipDuplicates: true,
    });
    if (!result.count) return;
    const h = await headers(),
      origin = h.get("origin") || "https://solavia.store";
    const data = {
      client_ip_address: ip !== "local" ? ip : undefined,
      client_user_agent: h.get("user-agent") || undefined,
      external_id: [hash(eventId)],
      fbp: typeof fbp === "string" ? fbp.slice(0, 150) : undefined,
      fbc: typeof fbc === "string" ? fbc.slice(0, 200) : undefined,
    };
    after(() => sendMeta(eventId, origin, data));
  } catch {}
}
