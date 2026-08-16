/**
 * Messaging service worker for volunteer push notifications.
 * Deliberately cache-free: it only shows notifications and focuses the app.
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = payload.title || "Live chat";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/app-icon-192.png",
      badge: "/app-icon-192.png",
      tag: "live-chat-waiting",
      renotify: true,
      data: { url: payload.url || "/volunteer-chat" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/volunteer-chat";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/volunteer-chat")) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
