self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Новое уведомление';
      const body = data.body || '';
      const url = data.url || '/';

      event.waitUntil(
        self.registration.showNotification(title, {
          body: body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          data: { url: url }
        })
      );
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('64 Lines', {
          body: text,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          data: { url: '/' }
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // simple matching
        if (client.url.includes(urlToOpen)) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
