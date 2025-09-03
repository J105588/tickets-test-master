# Service Worker エラー修正

## 問題の分析

Service Workerで以下のエラーが発生していました：

1. **404エラー**: `error-handler.js` ファイルが見つからない
2. **キャッシュエラー**: 削除されたファイルをキャッシュしようとして失敗

## 原因

システム整理の際に以下のファイルを削除しましたが、Service Workerのキャッシュ設定が更新されていませんでした：

- `error-handler.js` → `error-handler-enhanced.js`で代替
- `data-sync-api.js` → フォールバック機能で代替
- `offline-init.js` → フォールバック機能で代替
- `system-lock.js` → 未使用のため削除
- `offline.html` → 不要のため削除

## 修正内容

### 1. キャッシュ設定の更新

#### 削除されたファイルを除去
```javascript
// 修正前
urls: [
  '/data-sync-api.js',    // 削除済み
  '/offline-init.js',     // 削除済み
  '/error-handler.js',    // 削除済み
  '/system-lock.js'       // 削除済み
]

// 修正後
urls: [
  '/fallback-manager.js',        // 新規追加
  '/system-status.js',           // 新規追加
  '/error-handler-enhanced.js',  // 新規追加
  '/index-main.js'               // 新規追加
]
```

#### オフラインURLの修正
```javascript
// 修正前
const OFFLINE_URL = '/offline.html';  // 削除済みファイル

// 修正後
const OFFLINE_URL = '/index.html';    // 存在するファイル
```

### 2. キャッシュバージョンの更新

```javascript
// 修正前
const CACHE_NAME = 'ticket-system-v2';

// 修正後
const CACHE_NAME = 'ticket-system-v3';
```

キャッシュ名も更新：
- `critical-cache` → `critical-cache-v3`
- `high-cache` → `high-cache-v3`
- `normal-cache` → `normal-cache-v3`

### 3. エラーハンドリングの改善

#### 個別キャッシュ処理
```javascript
// 修正前（一括処理）
await cache.addAll(CACHE_STRATEGIES.CRITICAL.urls);

// 修正後（個別処理）
const cachePromises = CACHE_STRATEGIES.CRITICAL.urls.map(async (url) => {
  try {
    await cache.add(url);
    console.log(`キャッシュ成功: ${url}`);
  } catch (error) {
    console.warn(`キャッシュ失敗: ${url}`, error);
  }
});
await Promise.allSettled(cachePromises);
```

## 修正後の動作

### 1. エラー回避
- 存在しないファイルでエラーが発生しても、他のファイルのキャッシュは継続
- 各ファイルのキャッシュ結果が個別にログ出力される

### 2. 新しいファイルのキャッシュ
- `fallback-manager.js`: フォールバック機能
- `system-status.js`: システム状態表示
- `error-handler-enhanced.js`: 強化されたエラーハンドリング
- `index-main.js`: メイン画面機能

### 3. 古いキャッシュの自動削除
- バージョン更新により、古いキャッシュが自動的に削除される
- 新しいキャッシュが適切に作成される

## 期待される結果

1. **404エラーの解消**: 存在しないファイルへの参照が削除される
2. **キャッシュエラーの解消**: 個別処理により、一部のファイルでエラーが発生しても他のファイルは正常にキャッシュされる
3. **パフォーマンス向上**: 新しいファイルが適切にキャッシュされ、オフライン機能が正常に動作する
4. **ログの改善**: 各ファイルのキャッシュ結果が詳細にログ出力される

## 確認方法

1. ブラウザの開発者ツールでコンソールを確認
2. Service Workerのインストールログを確認
3. 各ファイルのキャッシュ成功/失敗ログを確認
4. オフライン機能が正常に動作することを確認

## 注意事項

- キャッシュバージョンを更新したため、既存のキャッシュは削除されます
- 初回アクセス時は全てのファイルが再キャッシュされます
- フォールバック機能により、キャッシュに失敗してもシステムは正常に動作します
