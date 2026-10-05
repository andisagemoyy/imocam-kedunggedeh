'use strict';
// Change APP_VERSION whenever the app shell, manifest, or icons change.
// Including the scope prevents deleting caches of a different installation
// hosted on another path of the same domain (for example, GitHub Pages).
const APP_VERSION = 'v1';
const CACHE_PREFIX = 'imocam-kdh:' + self.registration.scope + ':';
const CACHE_NAME = CACHE_PREFIX + APP_VERSION;
const ASSETS = [
  './index.html', './style.css', './app.js', './pwa.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-192.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
].map(path => new URL(path, self.registration.scope).href);
const INDEX_URL = ASSETS[0];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Download the complete version before it can become active.
    await cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const indexPath = new URL(INDEX_URL).pathname;
  const isHome = request.mode === 'navigate' &&
    (url.pathname === scope.pathname || url.pathname === indexPath);
  const isAsset = ASSETS.some(asset => new URL(asset).pathname === url.pathname);
  if (!isHome && !isAsset) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Keep HTML and its JS/CSS on the same version, including when offline.
    const cached = await cache.match(isHome ? INDEX_URL : request, { ignoreSearch: true });
    return cached || fetch(request);
  })());
});
