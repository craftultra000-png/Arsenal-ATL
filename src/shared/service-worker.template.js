/* هذا الملف قالب يُحوّله vite.config.ts إلى /service-worker.js مع قائمة أصول الإصدار. */
const CACHE_VERSION = '__ARSENAL_CACHE_VERSION__';
const CORE_CACHE = `arsenal-pwa-core-${CACHE_VERSION}`;
const RUNTIME_CACHE = 'arsenal-pwa-runtime-v1';
const PRECACHE = __ARSENAL_PRECACHE__;
const SENSITIVE_PATHS = [/^\/settings\/$/];

const isSameOrigin = (url) => url.origin === self.location.origin;
const isNavigation = (request) => request.mode === 'navigate';
const shouldCacheResponse = (response) => response && (response.ok || response.type === 'opaque');

async function putIfSuccessful(cache, request, response) {
  // الاحتفاظ باستجابة الشبكة نفسها يحفظ URL الداخلي اللازم لمحمّل وحدات ES، خصوصاً في chunks الأدوات المستقلة.
  if (shouldCacheResponse(response)) await cache.put(request, response.clone());
  return response;
}

async function cacheCoreAssets(requestId, source) {
  const cache = await caches.open(CORE_CACHE);
  const total = PRECACHE.length;
  let completed = 0;
  for (const path of PRECACHE) {
    try {
      const request = new Request(path, { cache: 'reload' });
      const response = await fetch(request);
      await putIfSuccessful(cache, request, response);
    } catch (error) {
      // يتابع التخزين: قد يكون المورد البعيد أو غير المهم غير متاح، بينما تبقى بقية الصفحات صالحة.
      console.warn('[pwa] Unable to cache', path, error);
    }
    completed += 1;
    source?.postMessage({ type: 'arsenal-offline-progress', requestId, completed, total, resource: path });
  }
  source?.postMessage({ type: 'arsenal-offline-complete', requestId, total });
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);
    await Promise.allSettled(PRECACHE.map(async (path) => {
      const request = new Request(path, { cache: 'reload' });
      const response = await fetch(request);
      await putIfSuccessful(cache, request, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith('arsenal-pwa-core-') && key !== CORE_CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const message = event.data;
  if (message?.type !== 'arsenal-cache-offline' || typeof message.requestId !== 'string') return;
  event.waitUntil(cacheCoreAssets(message.requestId, event.source));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (SENSITIVE_PATHS.some((pattern) => pattern.test(url.pathname)) && request.mode !== 'navigate') return;

  if (isNavigation(request)) {
    event.respondWith((async () => {
      const cache = await caches.open(CORE_CACHE);
      try {
        const response = await fetch(request);
        await putIfSuccessful(cache, request, response);
        return response;
      } catch {
        return (await cache.match(request, { ignoreSearch: true }))
          || (await cache.match(url.pathname, { ignoreSearch: true }))
          || (await cache.match('/'))
          || Response.error();
      }
    })());
    return;
  }

  if (isSameOrigin(url)) {
    event.respondWith((async () => {
      const core = await caches.open(CORE_CACHE);
      const runtime = await caches.open(RUNTIME_CACHE);
      const cached = (await core.match(request, { ignoreSearch: true })) || (await runtime.match(request, { ignoreSearch: true }));
      if (cached) return cached;
      try {
        const response = await fetch(request);
        await putIfSuccessful(runtime, request, response);
        return response;
      } catch {
        return Response.error();
      }
    })());
    return;
  }

  // تدفقات النماذج ومحركات WebAssembly البعيدة تُحفظ بعد أول تنزيل ناجح، ولا تُخزّن مسبقاً بسبب حجمها.
  if (url.hostname === 'huggingface.co' || url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith((async () => {
      const runtime = await caches.open(RUNTIME_CACHE);
      const cached = await runtime.match(request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const response = await fetch(request);
        await putIfSuccessful(runtime, request, response);
        return response;
      } catch {
        return Response.error();
      }
    })());
  }
});
