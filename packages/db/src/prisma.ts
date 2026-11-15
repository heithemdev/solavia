// packages/db/src/prisma.ts
// Shared Prisma client for the monorepo.
// Linked files: packages/db/src/index.ts and apps/web/lib/db.ts.
// Keep one client instance in development to avoid exhausting DB connections on hot reload.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Missing DATABASE_URL. Add the pooled Neon connection string before importing @repo/db.",
  );
}

const globalForPrisma = globalThis as typeof globalThis & {
  __repoDbPrisma__?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  return new PrismaClient({
    adapter,
  });
}

export const prisma = globalForPrisma.__repoDbPrisma__ ?? createPrismaClient();

// Keep `db` as the stable app-facing name.
// This prevents import churn across the web app and fixes `import { db } from "@repo/db"`.
export const db = prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__repoDbPrisma__ = prisma;
}

export default prisma;
