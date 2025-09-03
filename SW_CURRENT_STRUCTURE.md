# Service Worker 現在のファイル構造対応

## 概要

現在のファイル構造を維持したまま、sw.jsを適切に適用しました。削除されたファイルは含めず、存在するファイルのみをキャッシュ対象としています。

## 現在のファイル構造

### コア機能ファイル
- `api.js` - API通信管理
- `config.js` - 設定管理
- `sidebar.js` - サイドバー機能
- `fallback-manager.js` - フォールバック管理
- `system-status.js` - システム状態表示
- `error-handler-enhanced.js` - エラーハンドリング

### オフライン機能ファイル
- `offline-db.js` - IndexedDB管理
- `offline-sync.js` - 同期管理
- `priority-loader.js` - 優先度付きローダー
- `sw.js` - Service Worker

### メイン機能ファイル
- `seats-main.js` - 座席選択画面
- `walkin-main.js` - 当日券発行画面
- `timeslot-main.js` - 時間帯選択画面
- `index-main.js` - メイン画面
- `timeslot-schedules.js` - 時間帯スケジュール

### UIファイル
- `seats.html` - 座席選択画面
- `walkin.html` - 当日券発行画面
- `timeslot.html` - 時間帯選択画面
- `index.html` - メイン画面
- `seats.css` - 座席選択スタイル
- `walkin.css` - 当日券発行スタイル
- `styles.css` - 共通スタイル
- `sidebar.css` - サイドバースタイル

### その他のファイル
- `system-lock.js` - システムロック機能
- 各種ドキュメントファイル（README.md等）

### GASファイル（キャッシュ対象外）
- `Code.gs` - メインGAS
- `DataSyncGAS.gs` - データ同期GAS
- `TimeSlotConfig.gs` - 時間帯設定
- `SpreadsheetIds.gs` - スプレッドシートID管理
- `TimeSlotConfigOptimized.gs` - 最適化版時間帯設定
- `SpreadsheetIdsOptimized.gs` - 最適化版スプレッドシートID管理
- `system-setting.gs` - システム設定

## sw.jsの更新内容

### 1. キャッシュ戦略の更新

#### CRITICAL（最重要）
```javascript
urls: [
  '/',
  '/index.html',
  '/seats.html',
  '/walkin.html',
  '/timeslot.html',  // 追加
  '/styles.css',
  '/config.js',
  '/priority-loader.js'
]
```

#### HIGH（高優先度）
```javascript
urls: [
  '/api.js',
  '/offline-db.js',
  '/offline-sync.js',
  '/seats-main.js',
  '/walkin-main.js',
  '/timeslot-main.js',      // 追加
  '/index-main.js',         // 追加
  '/sidebar.js',
  '/fallback-manager.js',
  '/system-status.js',
  '/error-handler-enhanced.js',
  '/timeslot-schedules.js'  // 追加
]
```

#### NORMAL（通常優先度）
```javascript
urls: [
  '/seats.css',
  '/walkin.css',
  '/sidebar.css',
  '/system-lock.js'  // 追加
]
```

#### BACKGROUND（バックグラウンド）
```javascript
urls: [
  '/CNAME',
  '/LICENSE',
  '/README.md',
  '/OFFLINE_README.md',
  '/FALLBACK_SYSTEM_README.md',
  '/SERVICE_WORKER_FIX.md',
  '/SYSTEM_STRUCTURE.md',
  '/OPTIMIZATION_README.md'
]
```

### 2. キャッシュしないリソースの追加

```javascript
const NO_CACHE_URLS = [
  /\/api\//,
  /\/sync\//,
  /\.(json|xml)$/,
  /\.gs$/,  // GASファイルはキャッシュしない
  /\/Code\.gs$/,
  /\/DataSyncGAS\.gs$/,
  /\/TimeSlotConfig\.gs$/,
  /\/SpreadsheetIds\.gs$/,
  /\/TimeSlotConfigOptimized\.gs$/,
  /\/SpreadsheetIdsOptimized\.gs$/,
  /\/system-setting\.gs$/
];
```

### 3. キャッシュ処理の改善

- 個別ファイルキャッシュ処理により、一部のファイルでエラーが発生しても他のファイルのキャッシュを継続
- 4つの優先度レベル（CRITICAL, HIGH, NORMAL, BACKGROUND）での段階的キャッシュ
- 詳細なログ出力でキャッシュ状況を確認可能

## 期待される動作

### 1. エラー回避
- 存在しないファイルへの参照を削除
- 個別キャッシュ処理により、一部のファイルでエラーが発生しても他のファイルは正常にキャッシュ

### 2. 効率的なキャッシュ
- 優先度に応じた段階的キャッシュ
- 重要なファイルを優先的にキャッシュ
- ドキュメントファイルはバックグラウンドでキャッシュ

### 3. GASファイルの適切な処理
- GASファイルはキャッシュ対象外として設定
- サーバーサイドファイルとして適切に処理

## 確認方法

1. ブラウザの開発者ツールでコンソールを確認
2. Service Workerのインストールログを確認
3. 各優先度レベルのキャッシュ成功/失敗ログを確認
4. オフライン機能が正常に動作することを確認

## 利点

1. **完全性**: 現在存在するすべてのファイルを適切にキャッシュ
2. **効率性**: 優先度に応じた段階的キャッシュ
3. **堅牢性**: 個別キャッシュ処理により、エラー耐性を向上
4. **保守性**: 現在のファイル構造を維持しつつ、適切にキャッシュ
