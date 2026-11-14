export const config = { schedule: "15 0 * * *" };
export default async () => {
  const origin = process.env.URL || process.env.SITE_URL;
  if (!origin || !process.env.CRON_SECRET)
    throw new Error("Configure URL and CRON_SECRET");
  const response = await fetch(`${origin}/api/maintenance`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Maintenance failed (${response.status})`);
};
