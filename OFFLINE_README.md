# オフライン対応チケット管理システム

iPhoneやiPadなどでのオフライン環境でも正常に稼働するチケット管理システムです。ローカルデータベース（IndexedDB）を活用し、バックグラウンドで定期的に情報を取得・同期を行います。

## 🚀 主な機能

### オフライン対応機能
- **ローカルデータベース**: IndexedDBを使用した高速なローカルデータ保存
- **自動同期**: バックグラウンドでの定期的なデータ同期（30秒間隔）
- **オフライン検出**: ネットワーク状態の自動検出と切り替え
- **変更履歴管理**: オフライン時の変更を自動的に記録・同期
- **Service Worker**: バックグラウンドでのキャッシュと同期

### 対応操作
- 座席予約（オフライン対応）
- チェックイン（オフライン対応）
- 当日券発行（オフライン対応）
- 管理者編集（オフライン対応）

## 📱 iPhone/iPad対応

### PWA（Progressive Web App）対応
- ホーム画面への追加可能
- オフライン動作
- ネイティブアプリのような体験

### 高速動作
- ローカルデータベースによる高速アクセス
- 最小限のネットワーク通信
- 最適化されたUI/UX

## 🏗️ システム構成

### フロントエンド（オフライン対応）
```
├── offline-db.js      # IndexedDB管理
├── offline-sync.js    # 同期管理
├── offline-init.js    # 初期化
├── priority-loader.js  # 優先度付きローダー
├── data-sync-api.js   # データ取得専用API
├── sw.js             # Service Worker
└── offline.html      # オフライン画面
```

### バックエンド（分離されたGAS）
```
├── Code.gs           # 通常用GAS（メイン機能）
└── DataSyncGAS.gs   # データ取得専用GAS（別プロジェクト）
```

## ⚙️ セットアップ手順

### 1. フロントエンド設定
1. ファイルをWebサーバーにアップロード
2. HTTPS環境で動作（Service Worker要件）
3. ブラウザでアクセスしてPWAインストール

### 2. データ取得用GAS設定
1. 新しいGASプロジェクトを作成
2. `DataSyncGAS.gs`の内容をコピー
3. スプレッドシートIDを設定
4. デプロイしてURLを取得
5. `config.js`の`DATA_SYNC_GAS_URL`にURLを設定

### 3. 通常用GAS設定
1. 既存の`Code.gs`を使用
2. 必要に応じて機能を追加・更新

### 4. トリガー設定
```javascript
// データ取得用GASで実行
setupTriggers();
```

## 🔄 動作フロー

### オンライン時
1. サーバーから最新データを取得
2. ローカルデータベースに保存
3. 操作を即座にサーバーに送信
4. 成功時は変更履歴をクリア

### オフライン時
1. ローカルデータベースからデータを取得
2. 操作をローカルに保存
3. 変更履歴に記録
4. オンライン復帰時に自動同期

### 同期処理
1. 30秒間隔でバックグラウンド同期
2. 未同期の変更をサーバーに送信
3. 成功した変更を同期済みとしてマーク
4. エラー時は再試行

## 📊 データ構造

### IndexedDBスキーマ
```javascript
// 座席データ
seats: {
  id: 'performanceId_row_column',
  performanceId: 'group_day_timeslot',
  row: 'A-E',
  column: 1-20,
  status: 'available|reserved|checked-in',
  name: '予約者名',
  timestamp: Date
}

// 予約データ
reservations: {
  id: 'performanceId_row_column',
  performanceId: 'group_day_timeslot',
  row: 'A-E',
  column: 1-20,
  status: 'reserved|checked-in',
  name: '予約者名',
  timestamp: Date
}

// 変更履歴
changes: {
  id: 'auto-increment',
  type: 'reservation|checkin|walkin|admin_edit',
  data: Object,
  timestamp: Date,
  synced: boolean
}

// 設定
settings: {
  key: 'setting-name',
  value: 'setting-value',
  timestamp: Date
}
```

## 🛠️ 開発者向け

### デバッグ情報の取得
```javascript
// ブラウザコンソールで実行
await window.offlineInit.showDebugInfo();
```

### 手動同期
```javascript
// 手動で同期を実行
await offlineSync.syncChanges();
await offlineSync.syncData();
```

### キャッシュクリア
```javascript
// キャッシュとローカルデータをクリア
await offlineInit.clearCache();
await offlineDB.clear();
```

## 🔧 カスタマイズ

### 同期間隔の変更
```javascript
// offline-sync.js
this.syncIntervalMs = 30000; // 30秒 → 60秒に変更
```

### キャッシュ対象の追加
```javascript
// sw.js
const urlsToCache = [
  // 既存のファイル
  '/new-file.js'  // 追加
];
```

### オフライン画面のカスタマイズ
```html
<!-- offline.html -->
<div class="offline-container">
  <!-- カスタムコンテンツ -->
</div>
```

## 🚨 トラブルシューティング

### よくある問題

#### Service Workerが登録されない
- HTTPS環境であることを確認
- ブラウザの開発者ツールでエラーを確認

#### オフライン時データが表示されない
- 初回アクセス時にオンラインでデータを取得
- IndexedDBの初期化を確認

#### 同期が失敗する
- GASのURLが正しく設定されているか確認
- ネットワーク接続を確認

### ログ確認
```javascript
// ブラウザコンソールでログを確認
console.log('オフライン機能ログ');
```

## 📈 パフォーマンス最適化

### 速度重視の実装
- **分離されたGAS**: データ取得用と通常用を分離して通信負荷を分散
- **優先度付きローダー**: リソースの読み込み順序を最適化
- **最適化されたキャッシュ戦略**: 優先度別キャッシュで高速アクセス
- **IndexedDB**: 高速ローカルアクセス
- **最小限のネットワーク通信**: 必要な時のみサーバー通信
- **バックグラウンド同期**: 非ブロッキング処理
- **楽観的UI更新**: 即座なレスポンス

### 読み込み順序の最適化
1. **クリティカル**: IndexedDB初期化（即座実行）
2. **高優先度**: Service Worker登録（並列実行）
3. **通常優先度**: リスナー設定（非同期）
4. **低優先度**: 初期データ同期（バックグラウンド）

### キャッシュ戦略の最適化
- **クリティカルキャッシュ**: 必須リソース（キャッシュファースト）
- **高優先度キャッシュ**: 主要機能（古いキャッシュを返しつつ再検証）
- **通常キャッシュ**: その他機能（ネットワークファースト）
- **事前読み込み**: 予測されるリソースを事前にキャッシュ

### メモリ使用量最適化
- 不要なデータの自動クリーンアップ
- 効率的なデータ構造
- 最小限のキャッシュサイズ

## 🔮 今後の拡張予定

- プッシュ通知機能
- より高度な同期アルゴリズム
- 複数デバイス間の同期
- オフライン時の音声フィードバック

## 📄 ライセンス

MIT License

## 🤝 サポート

問題や質問がある場合は、GitHubのIssuesで報告してください。
