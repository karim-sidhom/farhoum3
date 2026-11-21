/* Mémoire hors ligne de la page : permet d'ouvrir la carte sans Internet */
var V = 'carte-v1';
var LEAFLET = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) {
    var jobs = LEAFLET.map(function (u) {
      return fetch(u, { mode: 'no-cors' }).then(function (r) { return c.put(u, r); });
    });
    jobs.push(fetch('./', { cache: 'reload' }).then(function (r) { return c.put('./', r); }));
    return Promise.all(jobs);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* bibliothèque Leaflet (et ses images) : mémoire d'abord */
  if (url.hostname === 'unpkg.com') {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(V).then(function (c) { c.put(req, copy); });
        return r;
      });
    }));
    return;
  }

  /* la page elle-même : on affiche tout de suite la version gardée, et on la met à jour en arrière-plan */
  if (url.origin === location.origin && !/\/rues\//.test(url.pathname) &&
      (req.mode === 'navigate' || /\.html$/.test(url.pathname))) {
    e.respondWith(caches.open(V).then(function (c) {
      return c.match('./').then(function (hit) {
        var net = fetch(req).then(function (r) { if (r.ok) c.put('./', r.clone()); return r; });
        return hit || net;
      });
    }));
  }
  /* tout le reste (blocs rues/, fonds de carte) passe normalement */
});
