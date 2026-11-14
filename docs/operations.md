# Solavia operations

The public landing page is static. `/api/storefront` loads the current public price and stock after paint. Product reads are cached for 30 seconds and invalidated after writes. Admin routes and every admin mutation require a database-backed session. There is no polling or background connection loop.

## First use

1. Open `/admin/login` and use the credentials supplied for this project.
2. In the dashboard, configure the actual available stock and price. No product or sample orders are seeded. Until configured and active, checkout is closed.
3. On each admin device, open the avatar menu and activate notifications. On iPhone/iPad, add the admin app to the home screen first.
4. Add the Meta Pixel ID and Conversions API access token on the Meta page. The token is encrypted with AES-256-GCM and is never sent back to the browser.

## Deployment

Copy the variables from `apps/web/.env.local` into Netlify environment settings using `apps/web/.env.example` as the checklist. Keep both the pooled `DATABASE_URL` and direct `DIRECT_URL`. Set `SITE_URL` and `VAPID_SUBJECT` to the actual HTTPS site URL. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is required at build time. The private key and encryption key must stay stable across deploys. Changing the encryption key makes an existing Meta token unreadable; changing VAPID keys requires subscribing devices again.

`netlify.toml` applies committed migrations, builds the Next.js app, and registers one daily cleanup function. Scheduled functions run on production deploys. The daily job uses `CRON_SECRET`, removes expired sessions/rate-limit records, and permanently removes orders that have been in the trash for 30 days. No cron handles order notifications: those are queued with Next.js `after()` immediately after a successful Server Action transaction. Push and Meta HTTP calls run outside database transactions with bounded timeouts.

Generate an environment-safe password hash with Node's built-in crypto: `scryptSync(password, salt, 64).toString('hex')`, where salt is `randomBytes(16).toString('hex')`. Store `scrypt:SALT:DIGEST` in `ADMIN_PASSWORD_HASH`. The colon delimiter avoids Next.js environment variable expansion. No plaintext admin password is stored in the application or database.

The web runtime pool is limited to two PostgreSQL connections per process. Analytics use daily aggregates, and visits are deduplicated per browser session/day. A new browser session starts after 30 minutes of inactivity. There is no heartbeat; inactive time is checked only when the page opens.

## Order rules

- An order atomically reserves stock and saves immutable product and shipping prices in centimes.
- A retry with the same key and payload returns the original order; changing the payload with that key is rejected.
- Canceling returns stock once, including canceling an already delivered order. Reconfirming a canceled order reserves stock again and fails if insufficient.
- Deleting an undelivered order cancels it before moving it to the trash. Deleting a delivered order only archives it. Restoring does not silently reserve stock again.
- Status mutations require the displayed version, preventing two admin tabs from overwriting each other.
- Dashboard revenue is the value of all placed orders, including cancellations, excluding delivery, as agreed. It is not collected/net revenue. Daily averages use the selected 7/30/90-day window.
- New orders appear first, oldest first. The other orders appear newest first. The list uses indexed keyset pagination, 25 orders at a time.
- The low-stock warning compares remaining stock to the last quantity explicitly saved by the admin, below 5 %. Zero stock has its own warning.

## Notifications and Meta

There is one notification event per order and one delivery attempt per subscribed device, linked to a valid admin session. Expired push endpoints are removed. Failed attempts are recorded in the database; no retry loop or polling service runs. A focused admin tab plays `/notification.ogg` after a user gesture, and refreshes once when notified. Background notification audio is controlled by the browser/OS, so a website cannot force a custom native notification sound.

With visitor consent, the browser and server use the same ID for PageView and OrderPlaced. Cancellations use versioned event IDs; Purchase is sent once per order when marked delivered. Without consent, order events are not sent. HTTP failures are recorded as FAILED rather than blocking or undoing orders. Current API version is configurable through `META_API_VERSION`.

Sharing sends only the public product link or a product card, never receipt/customer data. The receipt is generated as a PNG locally on the customer's device. Native sharing targets depend on installed apps; Instagram/TikTok/Stories have a product-image download and link-copy fallback.

## Verification

`pnpm --filter web build` verifies the production bundle. `pnpm --filter web exec tsc --noEmit` checks types.

The transaction suite creates a random isolated test schema, applies the same migration, exercises concurrent checkout and all stock transitions, then drops only that schema. It adds no production sample data. From PowerShell at the repository root:

```powershell
$env:NODE_OPTIONS='--conditions=react-server'
node --env-file=apps/web/.env.local packages/db/node_modules/tsx/dist/cli.mjs --tsconfig apps/web/tests/tsconfig.json apps/web/tests/orders.integration.ts
Remove-Item Env:NODE_OPTIONS
```

Native push delivery, background sound, and Meta event acceptance require a deployed HTTPS site, a real subscribed device, and valid Meta credentials. Local build or database tests do not prove those external deliveries. No network can guarantee a complete page load under 100 ms on a slow mobile connection.

The notification hook uses the platform-supported [`after()` lifecycle](https://nextjs.org/docs/app/api-reference/functions/after), which [Netlify supports](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
