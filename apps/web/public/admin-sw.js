/* Private data is never cached. Each saved order triggers one notification. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
async function unseen(id) {
  const cache = await caches.open("solavia-push-dedup-v1"),
    key = new Request(
      self.location.origin + "/admin/push-id/" + encodeURIComponent(id),
    );
  if (await cache.match(key)) return false;
  await cache.put(key, new Response("1"));
  const keys = await cache.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - 60)).map((k) => cache.delete(k)),
  );
  return true;
}
async function pageSound(client, id) {
  if (!client) return false;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve(false);
    }, 500);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data?.played === true);
    };
    client.postMessage({ type: "ORDER_SAVED", id }, [channel.port2]);
  });
}
self.addEventListener("push", (event) =>
  event.waitUntil(
    (async () => {
      let data;
      try {
        data = event.data.json();
      } catch {
        return;
      }
      if (!data.id || !(await unseen(data.id))) return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const admins = windows.filter(
        (w) =>
          new URL(w.url).pathname.startsWith("/admin") &&
          w.visibilityState === "visible",
      );
      const played = await pageSound(
        admins.find((w) => w.focused) || admins[0],
        data.id,
      );
      await self.registration.showNotification(
        data.title || "Nouvelle commande",
        {
          body: data.body,
          icon: "/images/solavia/admin/icon-192.png?v=3",
          badge: "/images/solavia/admin/badge.png",
          tag: data.id,
          data: { url: "/admin/orders" },
          silent: played,
        },
      );
    })(),
  ),
);
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL("/admin/orders", self.location.origin).href,
        windows = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        }),
        existing = windows.find((w) =>
          new URL(w.url).pathname.startsWith("/admin"),
        );
      if (existing) {
        await existing.navigate(url);
        await existing.focus();
      } else await self.clients.openWindow(url);
    })(),
  );
});
