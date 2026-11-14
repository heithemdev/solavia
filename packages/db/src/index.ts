// packages/db/src/index.ts
// Public exports for the shared DB package.
// Linked files: packages/db/src/prisma.ts and all app imports that read from @repo/db.
// Re-export both `prisma` and `db` so existing app imports stay stable.

export { db, prisma } from "./prisma";
export { default } from "./prisma";

export { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";