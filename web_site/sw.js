// ══════════════════════════════════════════════
//  Arsenal — Service Worker
//  استراتيجية: Cache First للأصول الثقيلة
//              Network First للصفحات
// ══════════════════════════════════════════════

const VERSION     = 'arsenal-v1';
const CACHE_CORE  = `${VERSION}-core`;
const CACHE_TOOLS = `${VERSION}-tools`;
const CACHE_HEAVY = `${VERSION}-heavy`;

// ── الأصول الأساسية — تُحمَّل فوراً عند التثبيت ──
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/arsenal_home/arsenal.html',
    '/arsenal_home/arsenal.css',
    '/arsenal_home/arsenal.js',
    '/arsenal_home/settings/settings.html',
    '/arsenal_home/settings/settings.css',
    '/arsenal_home/settings/settings.js',
    '/core/toolLoader.js',
    '/core/style_and_sound/arsenal-dropdown.css',
    '/core/style_and_sound/arsenal-dropdown.js',
    '/core/style_and_sound/arsenal_Silver.png',
    '/core/style_and_sound/click.wav',
    '/core/icons/icon-192.png',
    '/core/icons/icon-512.png',
    '/core/lang/ar.js',
    '/core/lang/en.js',
    '/core/lang/ru.js',
    '/core/lang/zh.js',
    '/core/core_app/lang.js',
    '/manifest.json',
];

// ── ملفات الأدوات — تُحمَّل عند أول استخدام وتُخزَّن ──
const TOOL_PATTERNS = [
    /\/(video|audio|image|pdf|text|multi_tools_library)\//,
];

// ── الملفات الثقيلة — cache أولوية قصوى ──
const HEAVY_PATTERNS = [
    /ffmpeg-core\.(js|wasm)/,
    /ffmpeg-core\.worker\.js/,
    /814\.ffmpeg\.js/,
    /ffmpeg\.js/,
    /\.wasm$/,
    /\.onnx$/,
    /ort\.min\.js/,
    /ort-wasm-simd/,
    /lame\.min\.js/,
    /Tone\.js/,
    /jspdf/,
    /pdf-lib/,
    /pdf\.min\.js/,
    /pdf\.worker/,
    /jszip/,
    /argon2/,
    /html2canvas/,
];

// ══ التثبيت ══════════════════════════════════
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_CORE)
            .then(cache => cache.addAll(CORE_ASSETS))
            .then(() => self.skipWaiting())
            .catch(err => console.warn('[SW] فشل تحميل بعض الأصول الأساسية:', err))
    );
});

// ══ التفعيل — حذف الـ cache القديم ══════════
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k.startsWith('arsenal-') && !k.startsWith(VERSION))
                    .map(k => {
                        console.log('[SW] حذف cache قديم:', k);
                        return caches.delete(k);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// ══ اعتراض الطلبات ═══════════════════════════
self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    const { pathname } = new URL(url);

    // تجاهل طلبات non-GET
    if (event.request.method !== 'GET') return;

    // تجاهل chrome-extension وغيرها
    if (!url.startsWith('http')) return;

    // تجاهل coi-serviceworker نفسه
    if (pathname.includes('coi-serviceworker')) return;

    // ── الملفات الثقيلة: Cache First دائماً ──
    if (HEAVY_PATTERNS.some(p => p.test(pathname))) {
        event.respondWith(cacheFirst(event.request, CACHE_HEAVY));
        return;
    }

    // ── ملفات الأدوات: Cache First بعد أول تحميل ──
    if (TOOL_PATTERNS.some(p => p.test(pathname))) {
        event.respondWith(cacheFirst(event.request, CACHE_TOOLS));
        return;
    }

    // ── الصفحات والأصول الأساسية: Network First ──
    event.respondWith(networkFirst(event.request, CACHE_CORE));
});

// ══ استراتيجيات الـ Cache ═════════════════════

// Cache First: يرجع من الـ cache، يحدّث في الخلفية
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Offline', { status: 503 });
    }
}

// Network First: يجرب الشبكة أولاً، يرجع للـ cache لو فشلت
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        // fallback للصفحة الرئيسية لو ما لقى شي
        return caches.match('/') || new Response('Offline', { status: 503 });
    }
}
