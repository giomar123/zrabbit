// Service Worker - Network-First (Always Online)
// This service worker does NOT cache any content
// All requests go directly to the network

const CACHE_NAME = 'zrabbit-no-cache';

// Install event - skip caching
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed (no-cache mode)');
  self.skipWaiting();
});

// Activate event - clean up all caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[Service Worker] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
  console.log('[Service Worker] Activated (all caches cleared)');
});

// Fetch event - always use network, never cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Always fetch from network, never use cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Return fresh response from network
        return response;
      })
      .catch((error) => {
        console.error('[Service Worker] Network request failed:', error);
        // Return a basic error response instead of cached content
        return new Response('Network error occurred', {
          status: 408,
          statusText: 'Request Timeout',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});
