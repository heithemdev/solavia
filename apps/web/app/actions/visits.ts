"use server";
import { db } from "@/lib/db";
import { hash, limit, requestIp } from "@/lib/server/security";
import { algeriaDay } from "@/lib/server/catalog";

export async function recordVisit(session: string) {
  if (!/^[a-f0-9-]{36}$/i.test(session)) return;
  try {
    await limit("visits", await requestIp(), 60, 3600);
    const day = algeriaDay(),
      sessionHash = hash(session);
    await db.$transaction(async (tx) => {
      const result = await tx.visitDedup.createMany({
        data: [{ day, sessionHash }],
        skipDuplicates: true,
      });
      if (result.count)
        await tx.dailyMetric.upsert({
          where: { day },
          create: { day, visits: 1 },
          update: { visits: { increment: 1 } },
        });
    });
  } catch {
    /* Analytics must never interrupt shopping. */
  }
}
