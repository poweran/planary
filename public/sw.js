// Планарий — Service Worker для офлайн-кэширования

const CACHE_NAME = 'planary-v1';
const ASSETS_TO_CACHE = [
    '/planary/',
    '/planary/index.html',
];

// Install — кэшируем основные ресурсы
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate — очищаем старые кэши
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch — стратегия Network First с fallback на кэш
self.addEventListener('fetch', (event) => {
    // Не кэшируем запросы к API и другим внешним ресурсам
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Кэшируем успешный ответ
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Если сеть недоступна — отдаём из кэша
                return caches.match(event.request);
            })
    );
});
