const CACHE_NAME = 'seats-management-v1';
const STATIC_CACHE_NAME = 'seats-management-static-v1';
const DYNAMIC_CACHE_NAME = 'seats-management-dynamic-v1';

// キャッシュする静的ファイル
const STATIC_FILES = [
  '/',
  '/index.html',
  '/seats.html',
  '/walkin.html',
  '/timeslot.html',
  '/offline.html',
  '/styles.css',
  '/seats.css',
  '/sidebar.css',
  '/walkin.css',
  '/pwa.css',
  '/config.js',
  '/api.js',
  '/sidebar.js',
  '/seats-main.js',
  '/walkin-main.js',
  '/timeslot-main.js',
  '/timeslot-schedules.js',
  '/index-main.js',
  '/pwa.js',
  '/manifest.json'
];

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Cache installation failed', error);
      })
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// フェッチ時の処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GAS APIの場合はネットワークファースト
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 成功した場合はキャッシュに保存
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // ネットワークエラーの場合はキャッシュから取得
          return caches.match(request);
        })
    );
    return;
  }

  // 静的ファイルの場合はキャッシュファースト
  if (request.method === 'GET' && request.destination !== 'document') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((fetchResponse) => {
              if (fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                caches.open(DYNAMIC_CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return fetchResponse;
            });
        })
    );
    return;
  }

  // HTMLファイルの場合はネットワークファースト
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // その他のリクエストは通常通り
  event.respondWith(fetch(request));
});

// バックグラウンド同期（オプション）
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(
      // バックグラウンドで実行したい処理をここに記述
      Promise.resolve()
    );
  }
});

// プッシュ通知（オプション）
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : '座席管理システムからの通知',
    icon: 'https://raw.githubusercontent.com/J105588/video-nazuna/main/images/IMG_5316.png',
    badge: 'https://raw.githubusercontent.com/J105588/video-nazuna/main/images/IMG_5316.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '詳細を見る',
        icon: 'https://raw.githubusercontent.com/J105588/video-nazuna/main/images/IMG_5316.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: 'https://raw.githubusercontent.com/J105588/video-nazuna/main/images/IMG_5316.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('座席管理システム', options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
