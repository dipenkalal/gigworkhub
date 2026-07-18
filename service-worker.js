// Gig Work Hub - minimal service worker.
// Purpose: satisfy PWA installability requirements and speed up repeat loads
// of the static app shell. Data itself always comes fresh from Supabase.

const CACHE_NAME = "gig-work-hub-shell-v1";
const SHELL_ASSETS = [
  "index.html",
  "history.html",
  "tax-summary.html",
  "settings.html",
  "styles.css",
  "app-core.js",
  "dashboard.js",
  "history.js",
  "tax-summary.js",
  "settings.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache Supabase API calls or anything cross-origin - always go to network.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first for the app shell so deploys show up quickly, falling back
  // to cache if offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
