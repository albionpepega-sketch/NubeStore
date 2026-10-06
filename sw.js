// sw.js - Guarda la app en el dispositivo para que abra sin internet (HU-08)
const CACHE = "nubestore-v1";
const ARCHIVOS = [
  "./", "index.html", "dashboard.html", "css/styles.css",
  "js/firebase.js", "js/auth.js", "js/productos.js", "js/ventas.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Con internet usa la versión más nueva; sin internet usa la guardada.
// Solo toca archivos de la app y el SDK de Firebase, no las llamadas a la base de datos.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;
  const sdk = url.hostname === "www.gstatic.com";
  if (!propio && !sdk) return;

  e.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return resp;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});