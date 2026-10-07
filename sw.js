// ========================================================
//  SANTA CATERINA CONNECTA — Service worker
//  - Fa l'app instal·lable i que s'obri sense connexió
//  - Rep i mostra les notificacions push
//  - En clicar una notificació, obre l'app on toca
// ========================================================

// Canvia el número quan vulguis forçar que tothom descarregui de nou els fitxers
const CACHE = 'santacaterina-v1';

// Fitxers propis de l'app que es guarden per poder obrir-la sense connexió
const FITXERS_APP = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Icona.png',
  '/Pantalla_inicial.png'
];

// ── Instal·lació: guardar els fitxers bàsics ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FITXERS_APP))
      .catch(() => {}) // si falta algun fitxer (p. ex. una imatge), l'app funciona igualment
  );
  self.skipWaiting();
});

// ── Activació: esborrar memòries cau de versions anteriors ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(claus => Promise.all(claus.filter(c => c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

// ── Peticions: primer la xarxa (sempre la versió nova), la còpia només si no hi ha connexió ──
// Només es toquen els fitxers propis de l'app. Supabase, Cloudinary i les fonts
// passen directament, sense guardar-se mai.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(resposta => {
        if (resposta && resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then(cache => cache.put(req, copia));
        }
        return resposta;
      })
      .catch(() =>
        caches.match(req).then(guardat =>
          guardat || (req.mode === 'navigate' ? caches.match('/index.html') : undefined)
        )
      )
  );
});

// ── Notificacions push ──
// L'app envia { title, body, tag, url } a la funció de Supabase, que ho reenvia aquí.
self.addEventListener('push', event => {
  let dades = {};
  try {
    dades = event.data ? event.data.json() : {};
  } catch (e) {
    dades = { body: event.data ? event.data.text() : '' };
  }

  const titol = dades.title || 'Santa Caterina Connecta';
  const opcions = {
    body: dades.body || '',
    tag: dades.tag || 'santacaterina',
    icon: '/Icona.png',
    badge: '/Icona.png',
    data: { url: dades.url || self.location.origin + '/' },
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(titol, opcions));
});

// ── Clic a una notificació ──
// Si l'app ja és oberta, la porta al davant i li diu on ha d'anar
// (index.html escolta el missatge 'push-navigate'). Si no, l'obre amb l'enllaç.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const desti = (event.notification.data && event.notification.data.url) || self.location.origin + '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(finestres => {
      const oberta = finestres.find(f => new URL(f.url).origin === self.location.origin);
      if (oberta) {
        oberta.postMessage({ type: 'push-navigate', url: desti });
        return oberta.focus();
      }
      return self.clients.openWindow(desti);
    })
  );
});
