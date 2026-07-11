// Minimal service worker for FKMTime.
//
// Two responsibilities today:
//   1. Handle Web Push events and show a native notification.
//   2. Focus/open a client window when the notification is clicked.
//
// No caching layer — installability is the goal, not offline browsing.

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "FKMTime", body: event.data.text() };
  }
  const title = payload.title || "FKMTime";
  const options = {
    body: payload.body || "",
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/" },
    icon: "/logo.svg",
    badge: "/logo.svg",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const targetUrl = new URL(targetPath, self.location.origin).href;
      for (const c of clients) {
        if (c.url === targetUrl && "focus" in c) return c.focus();
      }
      for (const c of clients) {
        if ("navigate" in c && "focus" in c) {
          await c.navigate(targetUrl);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })(),
  );
});
