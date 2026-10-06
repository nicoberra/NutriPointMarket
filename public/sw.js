/* Service Worker de Suple Market (PWA).
 *
 * REGLAS (leer antes de tocar):
 *  1. Las PÁGINAS (HTML) se piden SIEMPRE a la red, sin caché del navegador.
 *     Solo si la red falla del todo se usa la copia guardada de ESA MISMA URL.
 *     NUNCA se responde con otra página. (Antes, si fallaba la red, /admin/
 *     devolvía la portada guardada de la tienda: el CRM "aparecía" como la
 *     tienda, y encima en una versión vieja.)
 *  2. Archivos con hash (/_next/static/...) no cambian nunca: cache-first.
 *  3. Imágenes del sitio: se sirven de caché al instante y se actualizan de fondo.
 *  4. Todo lo demás (datos, RSC, manifest, etc.): red directa, sin caché.
 *  5. Al activarse una versión nueva se BORRAN todas las cachés viejas y toma el
 *     control de inmediato; la página se recarga sola (ver PWARegister).
 *
 * Subí VERSION en cada cambio del SW. */
var VERSION = "v4";
var CACHE = "suplemarket-" + VERSION;

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (k) {
            return k === CACHE ? null : caches.delete(k); // borra TODO lo viejo
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

function isHashedAsset(url) {
  return url.pathname.indexOf("/_next/static/") === 0;
}
function isImage(url) {
  return /\.(png|jpe?g|webp|gif|svg|ico|avif)$/i.test(url.pathname);
}

function putInCache(req, res) {
  if (res && res.status === 200 && res.type === "basic") {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) {
      c.put(req, copy);
    });
  }
  return res;
}

function offlinePage() {
  var html =
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>Sin conexión</title>" +
    "<style>body{font-family:system-ui,sans-serif;background:#f6f7fb;color:#1b1f3b;" +
    "display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px}" +
    "button{margin-top:16px;padding:12px 20px;border:0;border-radius:12px;background:#2129e3;" +
    "color:#fff;font-weight:700;font-size:16px}</style></head>" +
    "<body><div><h1>Sin conexión</h1>" +
    "<p>No se pudo cargar la página. Revisá tu conexión e intentá de nuevo.</p>" +
    '<button onclick="location.reload()">Reintentar</button></div></body></html>';
  return new Response(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 1) Páginas: red SIEMPRE (sin caché HTTP). Fallback SOLO a la misma URL.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(
        new Request(req.url, {
          cache: "no-store",
          redirect: "manual",
          credentials: "same-origin",
        })
      )
        .then(function (res) {
          // Redirecciones (ej. /admin → /admin/): las sigue el navegador.
          if (res.type === "opaqueredirect") return res;
          // Error del servidor/CDN: mejor la última copia buena de ESTA url.
          if (res.status >= 500) {
            return caches.match(req).then(function (cached) {
              return cached || res;
            });
          }
          return putInCache(req, res);
        })
        .catch(function () {
          return caches.match(req).then(function (cached) {
            return cached || offlinePage();
          });
        })
    );
    return;
  }

  // 2) Archivos con hash: cache-first (son inmutables).
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        return (
          cached ||
          fetch(req).then(function (res) {
            return putInCache(req, res);
          })
        );
      })
    );
    return;
  }

  // 3) Imágenes: caché al instante + actualización de fondo.
  if (isImage(url)) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        var net = fetch(req)
          .then(function (res) {
            return putInCache(req, res);
          })
          .catch(function () {
            return cached;
          });
        return cached || net;
      })
    );
    return;
  }

  // 4) Todo lo demás: red directa (no se intercepta ni se cachea).
});

self.addEventListener("message", function (event) {
  if (event.data === "skipWaiting") self.skipWaiting();
});
