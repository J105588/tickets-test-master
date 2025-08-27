const CACHE_NAME = 'seats-management-v2';
const STATIC_CACHE_NAME = 'seats-management-static-v2';
const DYNAMIC_CACHE_NAME = 'seats-management-dynamic-v2';
const RUNTIME_CACHE_NAME = 'seats-management-runtime-v2';

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
  '/manifest.json',
  // 外部リソースも事前キャッシュ
  'https://raw.githubusercontent.com/J105588/video-nazuna/main/images/IMG_5316.png'
];

// 高速化のためのキャッシュ戦略
const CACHE_STRATEGIES = {
  // 静的アセット: キャッシュファースト（最速）
  STATIC: ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'woff', 'woff2', 'ttf', 'eot'],
  // ナビゲーション: ネットワークファースト（新鮮さ重視）
  NAVIGATION: ['document'],
  // API: ネットワークファースト（データ新鮮さ）
  API: ['script.google.com']
};

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE_NAME);
      console.log('Service Worker: Caching static files');
      
      // 並列でキャッシュ（高速化）
      const cachePromises = STATIC_FILES.map(url => 
        cache.add(url).catch(err => 
          console.warn(`Failed to cache ${url}:`, err)
        )
      );
      
      await Promise.allSettled(cachePromises);
      console.log('Service Worker: Static files cached');
      await self.skipWaiting();
    })()
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    (async () => {
      // Clean old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      // Enable navigation preload for faster first byte
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (_) {}
      }

      // 古いキャッシュを削除（容量管理）
      const allCaches = await caches.keys();
      await Promise.all(
        allCaches.map(cacheName => {
          if (!cacheName.includes('v2')) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      console.log('Service Worker: Activated');
      await self.clients.claim();
    })()
  );
});

// フェッチ時の処理（最適化されたキャッシュ戦略 + 堅牢なエラーハンドリング）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 基本的なエラーハンドリング
  try {
    const url = new URL(request.url);
    
    // GAS API: ネットワークファースト（データ新鮮さ重視）
    if (url.hostname === 'script.google.com') {
      event.respondWith(
        fetch(request)
          .catch(error => {
            console.warn('GAS API fetch failed, falling back to offline page:', error);
            return caches.match('/offline.html').catch(() => new Response('オフラインです'));
          })
      );
      return;
    }

    // 静的アセット: キャッシュファースト（最速）
    if (request.method === 'GET' && request.destination !== 'document') {
      event.respondWith(
        caches.match(request)
          .then(cached => {
            if (cached) return cached;
            
            return fetch(request)
              .then(response => {
                if (response && response.status === 200) {
                  const responseClone = response.clone();
                  caches.open(RUNTIME_CACHE_NAME).then(cache => {
                    cache.put(request, responseClone).catch(err => 
                      console.warn('Failed to cache response:', err)
                    );
                    // 軽量なキャッシュ管理
                    cache.keys().then(keys => {
                      if (keys.length > 100) cache.delete(keys[0]).catch(() => {});
                    }).catch(() => {});
                  }).catch(err => console.warn('Failed to open runtime cache:', err));
                }
                return response;
              })
              .catch(error => {
                console.warn('Static asset fetch failed:', error);
                // オフライン時は静的ファイルを返す
                if (request.destination === 'image') {
                  return caches.match('https://raw.githubusercontent.com/J105588/video-nazuna/main/images/IMG_5316.png')
                    .catch(() => new Response('', { status: 404 }));
                }
                return new Response('', { status: 404 });
              });
          })
          .catch(error => {
            console.warn('Cache match failed:', error);
            return new Response('', { status: 404 });
          })
      );
      return;
    }

    // HTMLナビゲーション: ネットワークファースト（新鮮さ重視）
    if (request.destination === 'document') {
      event.respondWith(
        (async () => {
          try {
            // ネットワーク優先、キャッシュフォールバック
            const response = await fetch(request);
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                cache.put(request, responseClone).catch(err => 
                  console.warn('Failed to cache document:', err)
                );
              }).catch(err => console.warn('Failed to open dynamic cache:', err));
            }
            return response;
          } catch (error) {
            console.warn('Document fetch failed, trying cache:', error);
            try {
              // ネットワークエラー時はキャッシュから
              const cached = await caches.match(request);
              if (cached) return cached;
            } catch (cacheError) {
              console.warn('Cache match failed:', cacheError);
            }
            
            // 最終フォールバック
            try {
              return await caches.match('/offline.html');
            } catch (offlineError) {
              console.warn('Offline page not available:', offlineError);
              return new Response(`
                <html><body>
                  <h1>オフラインです</h1>
                  <p>インターネット接続を確認してください。</p>
                  <button onclick="location.reload()">再読み込み</button>
                </body></html>
              `, { headers: { 'Content-Type': 'text/html' } });
            }
          }
        })()
      );
      return;
    }

    // その他のリクエスト
    event.respondWith(
      fetch(request).catch(error => {
        console.warn('Fetch failed for other request:', error);
        return new Response('', { status: 404 });
      })
    );
    
  } catch (error) {
    console.error('Service Worker fetch handler error:', error);
    // 最悪の場合のフォールバック
    event.respondWith(new Response('エラーが発生しました', { status: 500 }));
  }
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
