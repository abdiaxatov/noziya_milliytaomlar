// Custom service worker to ensure PWA installability
importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js"
);

if (workbox) {
  // Set up workbox
  workbox.setConfig({ debug: false });

  // Cache the app shell
  workbox.precaching.precacheAndRoute([
    ...(self.__WB_MANIFEST || []),
    { url: "/_offline.html", revision: null },
  ]);

  // Runtime caching
  workbox.routing.registerRoute(
    /^https?.*/,
    new workbox.strategies.NetworkFirst({
      cacheName: "offlineCache",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
        }),
      ],
    })
  );

  // Cache Firebase Storage images
  workbox.routing.registerRoute(
    /^https:\/\/firebasestorage\.googleapis\.com\/.*/,
    new workbox.strategies.CacheFirst({
      cacheName: "firebase-images",
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );

  // Basic fetch handler to ensure PWA installability
  self.addEventListener("fetch", (event) => {
    // Let workbox handle the fetch, or fall back to network
    if (!event.respondWith) {
      return;
    }

    // If workbox doesn't handle it, try network
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === "navigate") {
          return caches.match("/_offline.html");
        }
      })
    );
  });

  // Install event
  self.addEventListener("install", (event) => {
    console.log("Service Worker installing.");
    self.skipWaiting();
  });

  // Activate event
  self.addEventListener("activate", (event) => {
    console.log("Service Worker activating.");
    event.waitUntil(clients.claim());
  });
} else {
  console.log("Workbox failed to load");
}
