// ========================================================
//  HI HA DE TOT — Service Worker v2
// ========================================================

const APP_URL = 'posa_aqui_url_vercel';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch (e) { payload = { title: 'Hi ha de tot', body: event.data.text() }; }

  const options = {
    body: payload.body || '',
    icon: '/Icona.png',
    badge: '/Icona.png',
    tag: payload.tag || 'hihadetot',
    data: { url: payload.url || APP_URL },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Hi ha de tot', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || APP_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          if ('navigate' in client) {
            return client.navigate(url).then(c => c ? c.focus() : null);
          }
          client.postMessage({ type: 'push-navigate', url });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
