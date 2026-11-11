/* Life Planner service worker: shows push reminders and opens the planner on click. */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : 'Life Planner' };
  }
  const title = data.title || 'Life Planner';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      data: { href: data.href || '/notifications' },
      tag: data.href || undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('navigate' in client) {
          client.navigate(href);
          return client.focus();
        }
      }
      return self.clients.openWindow(href);
    })
  );
});
