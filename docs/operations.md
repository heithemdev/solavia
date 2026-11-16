# Solavia operations

The storefront is prerendered with price, stock, and public Pixel ID in the initial HTML. The product and landing page revalidate every 30 seconds; admin product/order changes invalidate the product cache immediately. Price and stock also refresh on page focus/visibility and cross-tab admin changes; overlapping refresh requests are deduplicated. Checkout independently validates current database availability and price. Admin pages stream their static labels and layout immediately, with skeletons only where database values are pending. No polling, heartbeat, SSE, or WebSocket runs.

## Setup and deployment

Open `/admin/login` with the supplied credentials. Manage the real stock and price from the dashboard. The orders page uses the 58-zone delivery schedule and displays French destination names from the same pinned commune dataset as the Arabic checkout.

Set these environment variables in Netlify using the values in `apps/web/.env.local`: `DATABASE_URL`, `DIRECT_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `CAPI_ENCRYPTION_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SITE_URL`, `META_API_VERSION`, and `CRON_SECRET`. Never commit real environment files. Use `sslmode=verify-full` in both database URLs. The pooled URL serves the app; the direct URL serves migrations. The runtime pool is limited to two connections per process.

Keep the encryption and VAPID keys stable across deployments. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is needed at build time. Set `SITE_URL` and `VAPID_SUBJECT` to the actual HTTPS site URL. The admin password is stored as an environment-safe `scrypt:SALT:DIGEST` hash, never as plaintext.

`netlify.toml` applies committed migrations and builds the app. One daily scheduled function permanently removes orders that have spent 30 days in the trash and clears expired sessions and rate-limit records. Scheduled functions run on production deployments.

## Order handling

New orders keep immutable price snapshots and deduplicate retries, but do not reserve stock or add sales revenue. Confirmed and delivered orders reserve stock atomically and count toward revenue. Canceling returns stock once, including canceling a delivered order. Reconfirming a canceled order reserves stock again and fails if insufficient. Deleting an undelivered order cancels it; deleting a delivered order only archives it. Restore does not silently reserve stock. Status changes use a version guard.

Checkout takes a product row lock to validate availability, then commits customer number, order, daily order count, and notification/event records in one SQL statement. Confirmation is the stock-reservation point. The client runs the pill animation for the entire request without a forced minimum delay. Push and Meta delivery begin after the response. Admins can permanently delete a trashed order through an explicit confirmation; this does not alter stock again. Daily visit counts are visible numerically as well as in the chart. The avatar menu includes PWA installation and platform-specific installation instructions when the browser has no native prompt.

Customer numbers identify a phone number within a checkout session. Repeat orders for the same phone/session reuse the number; a new tab/session, 30 minutes without checkout activity, or a new Algerian calendar day allows a new number. The server also scopes the session to its current Algerian day. Historical numbers are preserved by the customer-sessions migration, which must run before deploying this checkout code (the Netlify build runs committed migrations). The thank-you screen uses the saved receipt in client state for the customer's name and phone; it makes no extra Server Action request. The download is generated locally, and sharing never includes customer information.

Dashboard revenue includes confirmed/delivered orders only, excluding shipping. Cancellation subtracts that order from revenue on its original order day and returns stock only if that order had reserved it. NEW and canceled orders contribute zero revenue. The stock warning is based on 5% of the last quantity explicitly saved by the admin.

## Notifications

Enable notifications from the avatar menu on each admin device. iPhone/iPad requires installing the admin app on the home screen. One saved order creates one notification event. Push attempts run through Next.js [`after()`](https://nextjs.org/docs/app/api-reference/functions/after), [supported by Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), outside the order transaction with bounded timeouts.

A visible admin tab plays `/notification.mp3` and acknowledges successful playback. The service worker silences the native alert only after that acknowledgement. If page audio is blocked or no admin page is visible, the native notification remains eligible for the device's standard sound. Websites cannot force a custom MP3 for background native notifications; browser/OS sound and Do Not Disturb settings still apply. The legacy `/sw.js` retires old root registrations; `/admin-sw.js` handles current admin notifications.

## Meta and verification

Configure the Pixel ID and access token in the Meta page. The token is encrypted with AES-256-GCM and never returned to the browser. With consent, browser and server share PageView and OrderPlaced IDs. Cancellation events use versioned IDs; Purchase is emitted once per order on delivery. Failed network attempts never undo an order.

Production build and transaction checks passed before the requested removal of test files. Real-device push sound and Meta acceptance still require verification on the deployed HTTPS site. Development first-route compilation and Neon cold starts add latency; warm production requests avoid compilation. Development Server Function argument logging is disabled to keep private form values and push keys out of the terminal.
