/* Service Worker de Suple Market (PWA).
 * Estrategia: network-first para lo propio del sitio (HTML/CSS/JS/imágenes del
 * mismo dominio). Estando online SIEMPRE se sirve lo último; sin conexión se usa
 * la copia guardada de la app.
 *
 * IMPORTANTE: los datos dinámicos (productos, pedidos, clientes, stock, panel)
 * vienen de la API de Google Apps Script y otros orígenes EXTERNOS. Esas
 * peticiones son cross-origin: el SW NO las intercepta ni las cachea, así que
 * siempre se leen frescas del servidor. Nunca se muestra info vieja.
 *
 * Subí el número de versión cada vez que cambie el sitio para invalidar la
 * caché vieja automáticamente. */
var VERSION = "v3";
var CACHE = "suplemarket-" + VERSION;

self.addEventListener("install", function (event) {
  // Activa la versión nueva sin esperar a que se cierren las pestañas viejas.
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (k) {
            if (k !== CACHE) return caches.delete(k); // borra cachés viejas
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;

  // Solo GET del MISMO origen. Todo lo demás (POST, y las APIs externas como
  // Apps Script / dólar / imágenes de GitHub) pasa de largo → red directa.
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first: intento traerlo de la red y actualizo la caché. Si falla
  // (sin conexión), respondo con la copia guardada.
  event.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(req, copy);
          });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (cached) {
          if (cached) return cached;
          // Fallback para navegaciones offline: la home guardada.
          if (req.mode === "navigate") return caches.match("/");
          return Response.error();
        });
      })
  );
});

// Permite forzar la activación desde la página (botón "actualizar" si se quiere).
self.addEventListener("message", function (event) {
  if (event.data === "skipWaiting") self.skipWaiting();
});
