// sw.js — PWA aislada para OptimeFlow(s) Mand△L@s

// Versión y nombres de caché namespaced (compatibilidad con tu esquema anterior)
const APP_PREFIX  = 'mandalas';
const APP_VERSION = 'v-1.0.';
const APP_CACHE   = `${APP_PREFIX}-app-${APP_VERSION}`;
const IMG_CACHE   = `${APP_PREFIX}-img-${APP_VERSION}`;
const OTHER_CACHE = `${APP_PREFIX}-rt-${APP_VERSION}`;

// Precaché mínimo y estable
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './assets/img/logo.png',
  './assets/img/logomandalas192.png',
  './assets/img/logomandalas512.png'
];

// Límite LRU para imágenes y timeout HTML
const IMG_CACHE_MAX_ENTRIES = 60;
const HTML_NETWORK_TIMEOUT  = 3500;

// Install
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(APP_CACHE).then((c) =>
      c.addAll(PRECACHE_URLS.map((u) => new Request(u, { cache: 'reload' })))
    )
  );
});

// Activate (limpia versiones viejas de este app, incluyendo tu esquema anterior)
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const keep = new Set([APP_CACHE, IMG_CACHE, OTHER_CACHE]);
    // Compatibilidad: limpia tanto el esquema nuevo como el antiguo
    const prefixes = [
      `${APP_PREFIX}-app-`, `${APP_PREFIX}-img-`, `${APP_PREFIX}-rt-`,
      'mandalas-', 'img-mandalas-', 'rt-mandalas-'
    ];
    await Promise.all(keys.map((k) => {
      if (prefixes.some(p => k.startsWith(p)) && !keep.has(k)) {
        return caches.delete(k);
      }
    }));
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

// Mensajes
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Helpers
function sameOrigin(u){
  try { return new URL(u, self.location).origin === self.location.origin; }
  catch { return false; }
}

async function putWithLRU(cacheName, request, response, max){
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  if (keys.length > max){
    await cache.delete(keys[0]); // FIFO simple
  }
}

function offlineFallbackResponse(){
  const html = `
    <!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Sin conexión</title>
    <style>body{font-family:system-ui,Segoe UI,Roboto;display:grid;place-items:center;min-height:100vh;background:#0b1221;color:#e5e7eb} .card{background:#111827;border:1px solid #374151;border-radius:12px;padding:18px;box-shadow:0 6px 22px rgba(0,0,0,.35);max-width:560px} h1{margin:0 0 8px;font-size:20px} p{opacity:.85;line-height:1.5} a{color:#22d3ee}</style>
    </head><body><div class="card">
    <h1>Estás sin conexión</h1>
    <p>No pudimos cargar la página desde la red y tampoco había una copia en caché.</p>
    <p>Vuelve a intentarlo cuando recuperes Internet.</p>
    </div></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
}

// Fetch strategies
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navegación (SPA)
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith((async () => {
      const cache = await caches.open(APP_CACHE);
      const cachedIndex = await cache.match('./index.html');

      // navigation preload si existe
      try {
        const preload = await e.preloadResponse;
        if (preload) {
          try { await cache.put('./index.html', preload.clone()); } catch(_) {}
          return preload;
        }
      } catch {}

      // carrera: red con timeout vs caché
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), HTML_NETWORK_TIMEOUT);

      try {
        const net = await fetch(req, { signal: ctrl.signal });
        clearTimeout(to);
        if (net && net.ok) {
          try { await cache.put('./index.html', net.clone()); } catch(_) {}
        }
        return net;
      } catch {
        clearTimeout(to);
        return cachedIndex || offlineFallbackResponse();
      }
    })());
    return;
  }

  // Imágenes (mismo origen): stale-while-revalidate con LRU
  if (req.destination === 'image' && sameOrigin(req.url)) {
    e.respondWith((async () => {
      const cache = await caches.open(IMG_CACHE);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then(async res => {
          if (res.ok) await putWithLRU(IMG_CACHE, req, res.clone(), IMG_CACHE_MAX_ENTRIES);
          return res;
        })
        .catch(() => null);
      return cached || fetchPromise || Response.error();
    })());
    return;
  }

  // Estáticos locales: cache-first
  if (sameOrigin(req.url)) {
    const pathname = url.pathname;
    const isStatic =
      pathname.endsWith('.html') ||
      pathname.endsWith('.json') ||
      pathname.endsWith('.ico')  ||
      pathname.endsWith('.css')  ||
      pathname.endsWith('.js')   ||
      pathname.endsWith('.woff') || pathname.endsWith('.woff2') ||
      pathname.startsWith('/icons/') ||
      pathname.startsWith('/assets/');
    if (isStatic) {
      e.respondWith(cacheFirst(req, APP_CACHE));
      return;
    }
  }

  // Resto: try cache OWN → network → cachea si ok
  e.respondWith((async () => {
    const cache = await caches.open(OTHER_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) await cache.put(req, res.clone());
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});

// Comunes
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) await cache.put(request, res.clone());
    return res;
  } catch {
    return cached || (request.destination === 'document' ? offlineFallbackResponse() : Response.error());
  }
}
