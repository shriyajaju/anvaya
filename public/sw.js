const CACHE = "anvaya-visitor-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const slug = event.data?.slug;
  if (!slug) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([`/${slug}`, `/api/visitor/${slug}`]).catch(() => undefined)),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const cacheable = url.pathname.startsWith("/api/visitor/") || url.pathname.includes("/storage/v1/object/public/published/") || url.pathname.startsWith("/seed-models/");
  if (!cacheable) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fresh = fetch(event.request)
        .then((response) => {
          if (response.ok) void cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
