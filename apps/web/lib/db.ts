// apps/web/lib/db.ts
// Server-only DB entry for the web app.
// Linked files: app server components, server actions, route handlers.
// Keep this file tiny so the app imports one stable DB surface.

import "server-only";

export { db, prisma } from "@repo/db";
export { default } from "@repo/db";