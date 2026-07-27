// =============================================
// SEM Brasil 2026 - Service Worker v4
// Production-ready with full PWA support
// =============================================

const CACHE_NAME = 'sem-brasil-v4';
const NO_CACHE_PATHS = [];

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './admin.html',
    './style.css',
    './app.js',
    './admin.js',
    './firebase-config.js',
    './seed-data.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[SW] Precache partial failure:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    
    // Skip non-GET, non-local, and Firebase/Google API calls
    if (url.origin !== self.location.origin) return;
    if (url.pathname.includes('firebase') || url.pathname.includes('googleapis')) return;
    
    // Skip Firestore REST calls
    if (url.pathname.includes('firestore') || url.hostname.includes('firestore')) return;
    
    // Skip Firebase Auth / Identity Platform
    if (url.hostname.includes('identitytoolkit') || url.hostname.includes('securetoken')) return;

    // Network-first strategy for HTML navigation
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => {
                    // Return offline fallback for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});