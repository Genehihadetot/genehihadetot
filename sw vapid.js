// ========================================================
//  SANTA CATERINA CONNECTA — Service worker (v0.25)
//  Va a l'arrel del repositori amb el nom sw.js (substitueix l'anterior).
//  No guarda res en memòria cau: l'app sempre es carrega fresca de la xarxa.
// ========================================================

const ICONA = '/Icona.png';

// Les versions noves del service worker s'activen de seguida
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Neteja memòries cau d'antics service workers, si n'hi havia
    const claus = await caches.keys();
    await Promise.all(claus.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Arriba una notificació
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { body: event.data ? event.data.text() : '' }; }

  const titol = d.title || 'Santa Caterina Connecta';
  event.waitUntil(self.registration.showNotification(titol, {
    body: d.body || '',
    icon: ICONA,
    badge: ICONA,
    tag: d.tag || 'santacaterina',   // mateix tag = substitueix l'anterior (no s'apilen)
    renotify: true,
    data: { url: d.url || '/' }
  }));
});

// Es toca la notificació
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const finestres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const app = finestres.find((c) => c.url.startsWith(self.location.origin));
    if (app) {
      // App ja oberta: la porta al davant i li diu on anar (l'index.html escolta 'push-navigate')
      await app.focus();
      app.postMessage({ type: 'push-navigate', url });
    } else {
      // App tancada: l'obre directament a l'adreça (l'index.html llegeix ?push=...)
      await self.clients.openWindow(url);
    }
  })());
});
