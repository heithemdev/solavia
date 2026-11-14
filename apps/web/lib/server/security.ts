import "server-only";
import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";

const derive = promisify(scrypt);
const COOKIE = "solavia_admin";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function requestIp() {
  const h = await headers();
  return (
    h.get("x-nf-client-connection-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}
export async function limit(
  scope: string,
  value: string,
  maximum: number,
  seconds: number,
) {
  const now = Date.now();
  const bucket = Math.floor(now / (seconds * 1000));
  const key = `${scope}:${hash(`${process.env.CAPI_ENCRYPTION_KEY}:${value}`)}:${bucket}`;
  const expiresAt = new Date((bucket + 1) * seconds * 1000);
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" (key,count,"expiresAt") VALUES (${key},1,${expiresAt}) ON CONFLICT (key) DO UPDATE SET count="RateLimit".count+1 RETURNING count`;
  if ((rows[0]?.count ?? maximum + 1) > maximum) throw new Error("RATE_LIMIT");
}
export async function passwordMatches(password: string) {
  const encoded = process.env.ADMIN_PASSWORD_HASH || "";
  const [algorithm, salt, digest] = encoded.split(":");
  if (
    algorithm !== "scrypt" ||
    !salt ||
    !digest ||
    password.length > 256 ||
    !/^[a-f0-9]{128}$/.test(digest)
  )
    return false;
  const actual = (await derive(password, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(digest, "hex"), actual);
}
export const getAdmin = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db.adminSession.findUnique({
    where: { tokenHash: hash(token) },
  });
  return session && !session.revokedAt && session.expiresAt > new Date()
    ? session
    : null;
});
export async function requireAdmin() {
  const session = await getAdmin();
  if (!session) redirect("/admin/login");
  return session;
}
export async function startSession() {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.adminSession.create({ data: { tokenHash: hash(token), expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    expires: expiresAt,
  });
}
export async function endSession() {
  const session = await getAdmin();
  if (session)
    await db.adminSession.delete({ where: { tokenHash: session.tokenHash } });
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}
function encryptionKey() {
  const key = process.env.CAPI_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Missing encryption key");
  return Buffer.from(key, "hex");
}
export function encrypt(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${data.toString("hex")}`;
}
export function decrypt(value: string) {
  const [iv, tag, data] = value.split(":");
  if (!iv || !tag || !data) throw new Error("Invalid encrypted token");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
