// sw.js
// Service Worker for background sync and offline support

const CACHE_NAME = 'ticket-system-v2';
const OFFLINE_URL = '/offline.html';

// 優先度別キャッシュ戦略
const CACHE_STRATEGIES = {
  CRITICAL: {
    name: 'critical-cache',
    urls: [
      '/',
      '/index.html',
      '/seats.html',
      '/walkin.html',
      '/styles.css',
      '/config.js',
      '/priority-loader.js'
    ],
    strategy: 'cache-first'
  },
  HIGH: {
    name: 'high-cache',
    urls: [
      '/api.js',
      '/data-sync-api.js',
      '/offline-db.js',
      '/offline-sync.js',
      '/offline-init.js',
      '/seats-main.js',
      '/walkin-main.js',
      '/sidebar.js'
    ],
    strategy: 'stale-while-revalidate'
  },
  NORMAL: {
    name: 'normal-cache',
    urls: [
      '/seats.css',
      '/walkin.css',
      '/sidebar.css',
      '/timeslot.html',
      '/timeslot-main.js',
      '/error-handler.js',
      '/system-lock.js'
    ],
    strategy: 'network-first'
  }
};

// キャッシュしないリソース
const NO_CACHE_URLS = [
  /\/api\//,
  /\/sync\//,
  /\.(json|xml)$/
];

// Service Worker インストール
self.addEventListener('install', (event) => {
  console.log('Service Worker インストール開始');
  event.waitUntil(
    Promise.all([
      // クリティカルリソースを即座にキャッシュ
      cacheCriticalResources(),
      // その他のリソースをバックグラウンドでキャッシュ
      cacheOtherResources()
    ]).then(() => {
      console.log('Service Worker インストール完了');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('Service Worker インストールエラー:', error);
    })
  );
});

// クリティカルリソースのキャッシュ
async function cacheCriticalResources() {
  const cache = await caches.open(CACHE_STRATEGIES.CRITICAL.name);
  console.log('クリティカルリソースをキャッシュ中...');
  await cache.addAll(CACHE_STRATEGIES.CRITICAL.urls);
  console.log('クリティカルリソースキャッシュ完了');
}

// その他のリソースのキャッシュ
async function cacheOtherResources() {
  const highCache = await caches.open(CACHE_STRATEGIES.HIGH.name);
  const normalCache = await caches.open(CACHE_STRATEGIES.NORMAL.name);
  
  console.log('高優先度リソースをキャッシュ中...');
  await highCache.addAll(CACHE_STRATEGIES.HIGH.urls);
  
  console.log('通常優先度リソースをキャッシュ中...');
  await normalCache.addAll(CACHE_STRATEGIES.NORMAL.urls);
  
  console.log('全リソースキャッシュ完了');
}

// Service Worker アクティベート
self.addEventListener('activate', (event) => {
  console.log('Service Worker アクティベート');
  event.waitUntil(
    Promise.all([
      // 古いキャッシュを削除
      cleanupOldCaches(),
      // 新しいキャッシュを準備
      prepareNewCaches()
    ]).then(() => {
      console.log('Service Worker アクティベート完了');
      return self.clients.claim();
    })
  );
});

// 古いキャッシュの削除
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name !== CACHE_STRATEGIES.CRITICAL.name &&
    name !== CACHE_STRATEGIES.HIGH.name &&
    name !== CACHE_STRATEGIES.NORMAL.name
  );
  
  await Promise.all(
    oldCaches.map(cacheName => {
      console.log('古いキャッシュを削除:', cacheName);
      return caches.delete(cacheName);
    })
  );
}

// 新しいキャッシュの準備
async function prepareNewCaches() {
  // 必要に応じて新しいキャッシュを準備
  console.log('新しいキャッシュ準備完了');
}

// フェッチイベント（最適化されたキャッシュ戦略）
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // キャッシュしないリソースの判定
  if (shouldNotCache(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // GAS API の場合はネットワークファースト
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(handleGASRequest(request));
    return;
  }

  // 静的ファイルの場合は優先度別キャッシュ戦略
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // その他のリクエストは通常通り
  event.respondWith(fetch(request));
});

// キャッシュしないリソースの判定
function shouldNotCache(url) {
  return NO_CACHE_URLS.some(pattern => pattern.test(url.pathname));
}

// GASリクエストの処理
async function handleGASRequest(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      // 成功したレスポンスをキャッシュに保存
      const responseClone = response.clone();
      const cache = await caches.open(CACHE_STRATEGIES.HIGH.name);
      cache.put(request, responseClone);
    }
    return response;
  } catch (error) {
    // ネットワークエラーの場合はキャッシュから取得
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// 静的リソースの処理
async function handleStaticRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 優先度別キャッシュ戦略の適用
  if (CACHE_STRATEGIES.CRITICAL.urls.includes(path)) {
    return handleCacheFirst(request, CACHE_STRATEGIES.CRITICAL.name);
  } else if (CACHE_STRATEGIES.HIGH.urls.includes(path)) {
    return handleStaleWhileRevalidate(request, CACHE_STRATEGIES.HIGH.name);
  } else if (CACHE_STRATEGIES.NORMAL.urls.includes(path)) {
    return handleNetworkFirst(request, CACHE_STRATEGIES.NORMAL.name);
  }

  // デフォルトはネットワークファースト
  return handleNetworkFirst(request, CACHE_STRATEGIES.NORMAL.name);
}

// キャッシュファースト戦略
async function handleCacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // オフライン時のフォールバック
    if (request.destination === 'document') {
      return caches.match(OFFLINE_URL);
    }
    throw error;
  }
}

// 古いキャッシュを返しつつ再検証戦略
async function handleStaleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // バックグラウンドでネットワークリクエストを実行
  const networkPromise = fetch(request).then(response => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // ネットワークエラーは無視
  });
  
  // キャッシュがあれば即座に返す
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // キャッシュがなければネットワークレスポンスを待つ
  try {
    return await networkPromise;
  } catch (error) {
    // オフライン時のフォールバック
    if (request.destination === 'document') {
      return caches.match(OFFLINE_URL);
    }
    throw error;
  }
}

// ネットワークファースト戦略
async function handleNetworkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // オフライン時のフォールバック
    if (request.destination === 'document') {
      return caches.match(OFFLINE_URL);
    }
    throw error;
  }
}

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  console.log('バックグラウンド同期開始:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      performBackgroundSync()
    );
  }
});

// バックグラウンド同期の実行
async function performBackgroundSync() {
  try {
    console.log('バックグラウンド同期実行中...');
    
    // クライアントに同期要求を送信
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'background-sync',
        timestamp: Date.now()
      });
    });
    
    console.log('バックグラウンド同期完了');
  } catch (error) {
    console.error('バックグラウンド同期エラー:', error);
  }
}

// プッシュ通知（将来の拡張用）
self.addEventListener('push', (event) => {
  console.log('プッシュ通知受信:', event);
  
  const options = {
    body: 'チケットシステムの更新があります',
    icon: '/icon.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '詳細を見る',
        icon: '/icon.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('チケットシステム', options)
  );
});

// 通知クリック
self.addEventListener('notificationclick', (event) => {
  console.log('通知クリック:', event);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// メッセージ受信
self.addEventListener('message', (event) => {
  console.log('Service Worker メッセージ受信:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'register-sync':
      // バックグラウンド同期を登録
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        self.registration.sync.register('background-sync');
      }
      break;
      
    case 'cache-clear':
      // キャッシュをクリア
      clearAllCaches();
      break;
      
    case 'cache-status':
      // キャッシュ状態を取得
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    case 'preload-resource':
      // リソースの事前読み込み
      preloadResource(data.url, data.priority);
      break;
      
    default:
      console.log('未知のメッセージタイプ:', type);
  }
});

// 全キャッシュのクリア
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('全キャッシュクリア完了');
}

// キャッシュ状態の取得
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = {
      count: keys.length,
      urls: keys.map(request => request.url)
    };
  }
  
  return status;
}

// リソースの事前読み込み
async function preloadResource(url, priority = 'normal') {
  try {
    const response = await fetch(url);
    if (response.status === 200) {
      const cacheName = getCacheNameByPriority(priority);
      const cache = await caches.open(cacheName);
      cache.put(url, response.clone());
      console.log(`リソース事前読み込み完了: ${url}`);
    }
  } catch (error) {
    console.error(`リソース事前読み込み失敗: ${url}`, error);
  }
}

// 優先度に基づくキャッシュ名の取得
function getCacheNameByPriority(priority) {
  switch (priority) {
    case 'critical':
      return CACHE_STRATEGIES.CRITICAL.name;
    case 'high':
      return CACHE_STRATEGIES.HIGH.name;
    case 'normal':
    default:
      return CACHE_STRATEGIES.NORMAL.name;
  }
}
