const CACHE_NAME = 'tabby-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network fetch or cache handle requests
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
