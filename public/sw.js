// Service worker for the installable judge app. Keeps the app shell and its hashed assets cached so the app
// opens instantly and survives a flaky venue Wi-Fi; live data still comes from Firestore (never cached here).
const CACHE = 'hhxt-shell-v3';
const SHELL = '/index.html';
// The check-in desk and the MC screen are served their own pages (manifest baked in), so each keeps its own cached shell.
const shellFor = (pathname) =>
  /^\/(admin\/check-in|checkin)\/?$/i.test(pathname) ? '/check-in.html' : /^\/mc\/?$/i.test(pathname) ? '/mc.html' : SHELL;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Pages: network first so a new deploy shows up on the next open; cached shell when offline.
  if (request.mode === 'navigate') {
    const shell = shellFor(url.pathname);
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(shell, copy));
          }
          return res;
        })
        .catch(() => caches.match(shell).then((hit) => hit || caches.match(SHELL)))
    );
    return;
  }

  // Build output is content-hashed, so a cached copy is always right.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname === '/logo.png') {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
      )
    );
  }
});
