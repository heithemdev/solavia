// Retire the old root worker; notifications now belong to /admin only.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.registration.unregister()),
);
