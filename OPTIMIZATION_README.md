# オフライン対応・バックグラウンド読み込み最適化

## 概要

このプロジェクトでは、オフライン対応とバックグラウンド読み込み機能を実装し、既存のTimeSlotConfig.gsとSpreadsheetIds.gsを複製・最適化して、DataSyncGAS.gsを最適化しました。

## 実装した機能

### 1. バックグラウンド読み込み機能 (`background-loader.js`)

- **オフライン対応**: システムがオフラインでも動作するように、すべての読み込みをバックグラウンドで実行
- **優先度付き読み込み**: リソースの重要度に応じて読み込み優先度を設定
- **キャッシュ管理**: 効率的なキャッシュシステムでデータの重複取得を防止
- **同期キュー**: オフライン時の変更を自動的に同期するキューシステム
- **並列処理**: 複数のパフォーマンスデータを並列で事前読み込み

#### 主要機能:
- `preloadPerformanceData()`: パフォーマンスデータの事前読み込み
- `getSeats()`: オフライン対応の座席データ取得
- `getReservations()`: オフライン対応の予約データ取得
- `recordChange()`: 変更の記録と同期キューへの追加
- `processSyncQueue()`: 同期キューの自動処理

### 2. 最適化された時間帯設定 (`TimeSlotConfigOptimized.gs`)

- **キャッシュ機能**: 時間帯データのキャッシュで高速化
- **優先度管理**: 時間帯ごとの優先度設定
- **オフライン対応フラグ**: 各時間帯のオフライン対応状況を管理
- **統計情報**: 時間帯データの統計情報取得機能

#### 主要機能:
- `getTimeslotTimeOptimized()`: 最適化された時間取得
- `getTimeslotPriority()`: 時間帯の優先度取得
- `isTimeslotOfflineEnabled()`: オフライン対応フラグ取得
- `getAllTimeslotsForGroupOptimized()`: 最適化された全時間帯取得
- `getTimeslotStatistics()`: 統計情報取得

### 3. 最適化されたスプレッドシートID管理 (`SpreadsheetIdsOptimized.gs`)

- **詳細な設定情報**: 各スプレッドシートの優先度、オフライン対応、バックアップ設定
- **キャッシュ機能**: スプレッドシートIDのキャッシュで高速化
- **検証機能**: スプレッドシートIDの妥当性検証
- **統計情報**: スプレッドシート設定の統計情報取得

#### 主要機能:
- `getSeatSheetIdOptimized()`: 最適化された座席シートID取得
- `getLogSheetIdOptimized()`: 最適化されたログシートID取得
- `getBackupSheetIdOptimized()`: バックアップシートID取得
- `getSpreadsheetDetails()`: スプレッドシート詳細情報取得
- `validateSpreadsheetId()`: スプレッドシートID検証

### 4. 最適化されたデータ同期GAS (`DataSyncGASOptimized.gs`)

- **キャッシュ機能**: APIレスポンスのキャッシュで高速化
- **バッチ処理**: 複数の変更を効率的にバッチ処理
- **並列処理**: 複数のデータ取得を並列で実行
- **エラーハンドリング**: 詳細なエラー情報とリトライ機能
- **統計情報**: 同期処理の統計情報取得

#### 主要機能:
- `getSeatsDataOptimized()`: 最適化された座席データ取得
- `getReservationsDataOptimized()`: 最適化された予約データ取得
- `syncLocalChangesOptimized()`: 最適化された変更同期
- `batchGetDataOptimized()`: バッチデータ取得
- `checkDataIntegrityOptimized()`: 最適化された整合性チェック

## 使用方法

### 1. バックグラウンド読み込みの初期化

```javascript
import { backgroundLoader } from './background-loader.js';

// 初期化
await backgroundLoader.init();

// パフォーマンスデータの事前読み込み
await backgroundLoader.preloadPerformanceData('見本演劇_1_A', 'background');
```

### 2. オフライン対応のデータ取得

```javascript
// 座席データの取得（オフライン対応）
const seats = await backgroundLoader.getSeats('見本演劇_1_A');

// 予約データの取得（オフライン対応）
const reservations = await backgroundLoader.getReservations('見本演劇_1_A');
```

### 3. 変更の記録と同期

```javascript
// 変更の記録
await backgroundLoader.recordChange('reservation', {
  performanceId: '見本演劇_1_A',
  row: 1,
  column: 1,
  status: 'reserved',
  name: 'テストユーザー'
});
```

### 4. 最適化された設定ファイルの使用

```javascript
// 時間帯情報の取得
const time = getTimeslotTimeOptimized('見本演劇', '1', 'A');
const priority = getTimeslotPriority('見本演劇', '1', 'A');
const isOffline = isTimeslotOfflineEnabled('見本演劇', '1', 'A');

// スプレッドシートIDの取得
const sheetId = getSeatSheetIdOptimized('見本演劇', '1', 'A');
const details = getSpreadsheetDetails('見本演劇', '1', 'A');
```

## パフォーマンス向上

### 1. キャッシュ機能
- データの重複取得を防止
- 5分間のTTL（Time To Live）でキャッシュ管理
- メモリ効率的なキャッシュ実装

### 2. 並列処理
- 複数のデータ取得を並列で実行
- バッチ処理による効率化
- 非同期処理の最適化

### 3. 優先度管理
- 重要度に応じた読み込み優先度
- リソースの効率的な利用
- ユーザー体験の向上

## オフライン対応

### 1. ローカルデータベース
- IndexedDBを使用したローカルデータ保存
- オフライン時のデータアクセス
- 自動的な同期機能

### 2. 同期キュー
- オフライン時の変更を自動的に同期
- リトライ機能付きの同期処理
- エラーハンドリング

### 3. フォールバック機能
- オンライン取得失敗時のローカルデータ使用
- 段階的なフォールバック処理
- ユーザーへの適切な通知

## 後方互換性

既存のコードとの互換性を保つため、元の関数名も提供しています：

- `getTimeslotTime()` → `getTimeslotTimeOptimized()`
- `getSeatSheetId()` → `getSeatSheetIdOptimized()`
- `getSeatsData()` → `getSeatsDataOptimized()`

## 設定

### 1. 優先度設定
- `critical`: 最重要（見本演劇など）
- `high`: 高優先度（通常の公演）
- `normal`: 通常優先度
- `low`: 低優先度
- `background`: バックグラウンド

### 2. オフライン対応フラグ
- `true`: オフライン対応有効
- `false`: オフライン対応無効

### 3. バックアップ設定
- `true`: バックアップ有効
- `false`: バックアップ無効

## 監視・デバッグ

### 1. 統計情報の取得

```javascript
// バックグラウンドローダーの統計
const stats = await backgroundLoader.getStats();

// キャッシュ統計
const cacheStats = getCacheStatistics();

// スプレッドシート統計
const sheetStats = getSpreadsheetStatistics();
```

### 2. ログ出力
- 詳細なデバッグログ
- エラー情報の記録
- パフォーマンス情報の出力

## 今後の拡張

1. **Service Worker連携**: より高度なオフライン機能
2. **リアルタイム同期**: WebSocketを使用したリアルタイム同期
3. **データ圧縮**: データ転送量の削減
4. **予測読み込み**: ユーザー行動の予測による事前読み込み

## 注意事項

1. **GAS環境**: Google Apps Script環境では、一部の機能が制限される場合があります
2. **ブラウザ対応**: モダンブラウザでの動作を前提としています
3. **データサイズ**: 大量のデータを扱う場合は、メモリ使用量に注意してください
4. **同期頻度**: 同期頻度は適切に調整してください

## トラブルシューティング

### 1. キャッシュクリア
```javascript
// 全キャッシュをクリア
await backgroundLoader.clearCache();
clearTimeslotCache();
clearSpreadsheetCache();
```

### 2. 同期状態の確認
```javascript
// 同期状態を確認
const stats = await backgroundLoader.getStats();
console.log('未同期変更数:', stats.unsyncedChangesCount);
```

### 3. エラーログの確認
- ブラウザの開発者ツールでコンソールログを確認
- エラーの詳細情報を確認
- 必要に応じてキャッシュをクリア
