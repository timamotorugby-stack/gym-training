const CACHE = "gym-training-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isShell(pathname) {
  const base = new URL("./", self.location).pathname;
  return ["", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"]
    .some((name) => pathname === `${base}${name}`);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !isShell(url.pathname)) return;

  const clean = new URL(url.pathname, self.location.origin).href;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic" && !response.redirected) {
        await cache.put(clean, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(clean)
        || (request.mode === "navigate" && (
          await cache.match(new URL("./index.html", self.location).href)
          || await cache.match(new URL("./", self.location).href)
        ));
      if (cached) return cached;
      throw error;
    }
  })());
});
