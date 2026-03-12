// sw.js — PWA offline fuerte para OptimeFlow(s) Mand△L@s

const APP_PREFIX  = 'mandalas';
const APP_VERSION = 'v.1.0';
const APP_CACHE   = `${APP_PREFIX}-app-${APP_VERSION}`;
const IMG_CACHE   = `${APP_PREFIX}-img-${APP_VERSION}`;
const OTHER_CACHE = `${APP_PREFIX}-rt-${APP_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './shell-optime.css',

  './app.js',
  './galeria.js',
  './export.js',
  './studio.js',
  './router.js',
  './i18n.js',
  './desktop-guard.js',

  './manifest.webmanifest',

  './assets/img/logo.png',
  './assets/img/logomandalas192.png',
  './assets/img/logomandalas512.png',
  './assets/img/logomandalasheader192.png',

  './lang/de.json',
  './lang/en.json',
  './lang/es.json',
  './lang/fr.json',
  './lang/it.json',
  './lang/ja.json',
  './lang/ko.json',
  './lang/pt-BR.json',
  './lang/ru.json',
  './lang/zh.json'
];

const IMG_CACHE_MAX_ENTRIES = 80;
const HTML_NETWORK_TIMEOUT  = 3500;

function toAbsolute(url){
  return new URL(url, self.location).href;
}

function sameOrigin(url){
  try{
    return new URL(url, self.location).origin === self.location.origin;
  }catch(_){
    return false;
  }
}

function getAliasAbsolute(url){
  try{
    var pathname = new URL(url, self.location).pathname;

    if(
      pathname.endsWith('/lang/zh-CN.json') ||
      pathname.endsWith('/lang/zh-cn.json')
    ){
      return toAbsolute('./lang/zh.json');
    }

    if(
      pathname.endsWith('/lang/ja-JP.json') ||
      pathname.endsWith('/lang/ja-jp.json')
    ){
      return toAbsolute('./lang/ja.json');
    }

    return null;
  }catch(_){
    return null;
  }
}

async function putWithLRU(cacheName, request, response, maxEntries){
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());

  const keys = await cache.keys();
  if(keys.length > maxEntries){
    await cache.delete(keys[0]); // FIFO simple
  }
}

function offlineFallbackResponse(){
  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Sin conexión</title>
        <style>
          body{
            font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;
            display:grid;
            place-items:center;
            min-height:100vh;
            margin:0;
            background:#0b1221;
            color:#e5e7eb;
            padding:16px;
          }
          .card{
            background:#111827;
            border:1px solid #374151;
            border-radius:12px;
            padding:18px;
            box-shadow:0 6px 22px rgba(0,0,0,.35);
            max-width:560px;
          }
          h1{
            margin:0 0 8px;
            font-size:20px;
          }
          p{
            opacity:.85;
            line-height:1.5;
            margin:0 0 10px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Estás sin conexión</h1>
          <p>No pudimos cargar la página desde la red y tampoco había una copia en caché.</p>
          <p>Vuelve a intentarlo cuando recuperes Internet.</p>
        </div>
      </body>
    </html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function cacheFirstApp(originalRequest, cacheLookup){
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(cacheLookup || originalRequest);
  if(cached) return cached;

  try{
    const response = await fetch(cacheLookup || originalRequest);
    if(response && response.ok){
      await cache.put(cacheLookup || originalRequest, response.clone());
    }
    return response;
  }catch(_){
    return originalRequest.destination === 'document'
      ? offlineFallbackResponse()
      : Response.error();
  }
}

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await cache.addAll(
      CORE_ASSETS.map((url) => new Request(url, { cache: 'reload' }))
    );
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const keep = new Set([APP_CACHE, IMG_CACHE, OTHER_CACHE]);

    const prefixes = [
      `${APP_PREFIX}-app-`,
      `${APP_PREFIX}-img-`,
      `${APP_PREFIX}-rt-`,
      'mandalas-',
      'img-mandalas-',
      'rt-mandalas-'
    ];

    await Promise.all(
      keys.map((key) => {
        if(prefixes.some((p) => key.startsWith(p)) && !keep.has(key)){
          return caches.delete(key);
        }
      })
    );

    if('navigationPreload' in self.registration){
      try{
        await self.registration.navigationPreload.enable();
      }catch(_){}
    }

    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  // Alias de idiomas / ficheros canónicos
  const aliasAbs = sameOrigin(req.url) ? getAliasAbsolute(req.url) : null;

  // Navegación SPA / documentos
  if(req.mode === 'navigate' || req.destination === 'document'){
    event.respondWith((async () => {
      const cache = await caches.open(APP_CACHE);
      const cachedIndex =
        (await cache.match('./index.html')) ||
        (await cache.match('./'));

      try{
        const preload = await event.preloadResponse;
        if(preload){
          try{
            await cache.put('./index.html', preload.clone());
          }catch(_){}
          return preload;
        }
      }catch(_){}

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), HTML_NETWORK_TIMEOUT);

      try{
        const net = await fetch(req, { signal: ctrl.signal });
        clearTimeout(timer);

        if(net && net.ok){
          try{
            await cache.put('./index.html', net.clone());
          }catch(_){}
        }
        return net;
      }catch(_){
        clearTimeout(timer);
        return cachedIndex || offlineFallbackResponse();
      }
    })());
    return;
  }

  // Imágenes mismo origen:
  // 1) primero mira APP_CACHE (precaché)
  // 2) luego IMG_CACHE (runtime)
  // 3) luego red + LRU
  if(req.destination === 'image' && sameOrigin(req.url)){
    event.respondWith((async () => {
      const appCache = await caches.open(APP_CACHE);
      const precached = await appCache.match(aliasAbs || req);
      if(precached) return precached;

      const imgCache = await caches.open(IMG_CACHE);
      const cached = await imgCache.match(req);

      const fetchPromise = fetch(aliasAbs || req)
        .then(async (res) => {
          if(res && res.ok){
            await putWithLRU(IMG_CACHE, req, res.clone(), IMG_CACHE_MAX_ENTRIES);
          }
          return res;
        })
        .catch(() => null);

      return cached || fetchPromise || Response.error();
    })());
    return;
  }

  // Estáticos locales del app shell: cache-first
  if(sameOrigin(req.url)){
    const pathname = url.pathname;
    const isStatic =
      pathname.endsWith('.html') ||
      pathname.endsWith('.css') ||
      pathname.endsWith('.js') ||
      pathname.endsWith('.json') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.webmanifest') ||
      pathname.endsWith('.woff') ||
      pathname.endsWith('.woff2') ||
      pathname.startsWith('/assets/') ||
      pathname.startsWith('/lang/');

    if(isStatic){
      event.respondWith(cacheFirstApp(req, aliasAbs || req));
      return;
    }
  }

  // Resto: cache si existe -> red -> cache runtime si ok
  event.respondWith((async () => {
    const cache = await caches.open(OTHER_CACHE);
    const cached = await cache.match(req);
    if(cached) return cached;

    try{
      const res = await fetch(req);
      if(res && (res.ok || res.type === 'opaque')){
        await cache.put(req, res.clone());
      }
      return res;
    }catch(_){
      return cached || Response.error();
    }
  })());
});