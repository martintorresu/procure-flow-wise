// Service Worker dedicado de la PWA "Minuta Activa" (/minuta.html)
const CACHE_NAME = "minuta-v1";
const PRECACHE = ["/minuta.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("minuta-") && k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Solo maneja la app de Minuta y sus assets del mismo origen
  const isOwnScope = url.origin === self.location.origin;
  const isApi = url.hostname.includes("supabase.co");

  if (isApi) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  if (!isOwnScope) return;

  // Navegaciones: NetworkFirst (nunca cache-first para HTML)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put("/minuta.html", clone));
          return res;
        })
        .catch(() => caches.match("/minuta.html")),
    );
    return;
  }

  // Assets estáticos: cache-first
  e.respondWith(
    caches.match(req).then(
      (r) =>
        r ||
        fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        }),
    ),
  );
});
