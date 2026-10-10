/* Shop Book app: keeps the app's files on the phone so it opens without internet.
   The records themselves are kept by the page (IndexedDB), not here. */
var KEY = 'alima', VERSION = '39be2d153b02';
var CACHE = 'shopbook-' + KEY + '-' + VERSION;
var SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './libs/jspdf.umd.min.js', './libs/xlsx.full.min.js', './libs/jszip.min.js'];
var FRESH = /\/(index\.html|catalogue\.html|config\.js|manifest\.webmanifest)?$/;   // pages and settings: newest when online
var APPPAGE = /\/(index\.html)?$/;                                              // the Shop Book itself (the catalogue page is separate)

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('shopbook-' + KEY + '-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); }); }
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                                      // the store server (POST) is never cached
  if (/(^|\.)script\.google(usercontent)?\.com$/.test(url.hostname)) return;
  var same = url.origin === self.location.origin;
  if (req.mode === 'navigate' || (same && FRESH.test(url.pathname))) {
    // newest page when the internet is good; the kept copy when it is slow or absent
    var key = APPPAGE.test(url.pathname) ? './index.html' : url.origin + url.pathname;   // never file another page as the app
    e.respondWith(Promise.race([fetch(req, { cache: 'no-store' }), timeout(4000)]).then(function (r) {
      if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(key, cp); }); }
      return r;
    }).catch(function () {
      return caches.match(key, { ignoreSearch: true }).then(function (m) { return m || (APPPAGE.test(url.pathname) ? caches.match('./index.html') : m); });
    }));
    return;
  }
  var font = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (same || font) {
    // app files and fonts: the kept copy first, fetched once and kept if missing
    e.respondWith(caches.match(req, { ignoreSearch: same }).then(function (m) {
      return m || fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); } return r; });
    }));
  }
});
