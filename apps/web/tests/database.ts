import { PrismaClient } from "@repo/db";
import { PrismaPg } from "../../../packages/db/node_modules/@prisma/adapter-pg/dist/index.mjs";
if (!/^solavia_test_[a-f0-9]+$/.test(process.env.TEST_SCHEMA || ""))
  throw new Error("Isolated test schema required");
export const db = new PrismaClient({
  adapter: new PrismaPg(
    {
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      max: 4,
    },
    { schema: process.env.TEST_SCHEMA },
  ),
});
