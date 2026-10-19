// FQT 2026 食品安全抽检抽样量移动查询工具 V2.0 - Service Worker
const CACHE_NAME = 'fqt-sampling-v2.0-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.png'
];

// Install Event: 预缓存核心静态文件
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all static assets for 100% offline access');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.warn('[Service Worker] Pre-cache error:', err);
    })
  );
});

// Activate Event: 清理历史版本废弃缓存并立即生效
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: 强缓存优先策略 (Cache First, Network Fallback)
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // 命中强缓存，直接返回（秒开、零流量、100%飞行模式支持）
        return cachedResponse;
      }

      // 未命中缓存时发起网络请求，并动态存入缓存
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // 离线且无法获取网络资源时的容灾降级
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
