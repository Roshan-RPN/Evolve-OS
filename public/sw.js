self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  const { title, body, url } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "Life OS", {
      body: body || "",
      icon: "/icon",
      badge: "/icon",
      data: { url: url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
