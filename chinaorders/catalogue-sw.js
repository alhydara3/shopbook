/* AH CHINA ORDERS catalogue (customers): lets the page be added to the home screen.
   It does not keep the Shop Book app or any records. The page is fetched fresh when the internet works;
   the last copy opens if the connection is slow or missing. The store's data always comes live from the server. */
var CACHE = 'ah-catalogue-v1';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('ah-catalogue-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function timeout(ms) { return new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); }); }
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return;
  var key = new URL(req.url); key.hash = ''; key = key.origin + key.pathname;
  e.respondWith(Promise.race([fetch(req, { cache: 'no-store' }), timeout(4000)]).then(function (r) {
    if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(key, cp); }); }
    return r;
  }).catch(function () { return caches.match(key).then(function (m) { return m || fetch(req); }); }));
});
