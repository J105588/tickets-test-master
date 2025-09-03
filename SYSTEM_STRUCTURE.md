# システム構造整理

## 概要

オフライン機能が使えなくてもシステムが問題なく動くように、フォールバック機能を実装し、システムの構造を整理しました。

## 整理後のファイル構造

### コア機能ファイル
```
├── api.js                    # API通信管理
├── config.js                 # 設定管理
├── sidebar.js                # サイドバー機能
├── fallback-manager.js       # フォールバック管理
├── system-status.js          # システム状態表示
├── error-handler-enhanced.js # エラーハンドリング
```

### オフライン機能ファイル
```
├── offline-db.js             # IndexedDB管理
├── offline-sync.js           # 同期管理
├── priority-loader.js        # 優先度付きローダー
├── sw.js                     # Service Worker
```

### メイン機能ファイル
```
├── seats-main.js             # 座席選択画面
├── walkin-main.js            # 当日券発行画面
├── timeslot-main.js          # 時間帯選択画面
├── index-main.js             # メイン画面
```

### UIファイル
```
├── seats.html                # 座席選択画面
├── walkin.html               # 当日券発行画面
├── timeslot.html             # 時間帯選択画面
├── index.html                # メイン画面
├── seats.css                 # 座席選択スタイル
├── walkin.css                # 当日券発行スタイル
├── styles.css                # 共通スタイル
├── sidebar.css               # サイドバースタイル
```

### GASファイル
```
├── Code.gs                   # メインGAS
├── DataSyncGAS.gs            # データ同期GAS
├── TimeSlotConfig.gs         # 時間帯設定
├── SpreadsheetIds.gs         # スプレッドシートID管理
```

### 設定・ドキュメントファイル
```
├── CNAME                     # GitHub Pages設定
├── LICENSE                   # ライセンス
├── README.md                 # メインREADME
├── OFFLINE_README.md         # オフライン機能説明
├── FALLBACK_SYSTEM_README.md # フォールバック機能説明
├── SYSTEM_STRUCTURE.md       # システム構造説明（このファイル）
```

## 削除されたファイル

### 重複ファイル
- `error-handler.js` → `error-handler-enhanced.js`で代替
- `data-sync-api.js` → フォールバック機能で代替

### 最適化版ファイル（元ファイルで十分）
- `DataSyncGASOptimized.gs` → `DataSyncGAS.gs`で代替
- `TimeSlotConfigOptimized.gs` → `TimeSlotConfig.gs`で代替
- `SpreadsheetIdsOptimized.gs` → `SpreadsheetIds.gs`で代替

### 未使用ファイル
- `background-loader.js` → フォールバック機能で代替
- `offline-init.js` → フォールバック機能で代替
- `offline.html` → 不要
- `system-lock.js` → 未使用
- `system-setting.gs` → 未使用

### 重複ドキュメント
- `OPTIMIZATION_README.md` → `FALLBACK_SYSTEM_README.md`で代替

## システムの動作フロー

### 1. 正常動作時
```
ユーザー操作 → フォールバックマネージャー → オフライン機能 → ローカル/サーバー → 結果表示
```

### 2. オフライン機能エラー時
```
ユーザー操作 → フォールバックマネージャー → 直接サーバー通信 → 結果表示
```

### 3. 完全オフライン時
```
ユーザー操作 → フォールバックマネージャー → エラーハンドリング → ユーザー通知
```

## 主要機能

### フォールバックマネージャー
- オフライン機能の可用性を自動検出
- 問題がある場合は直接サーバー通信にフォールバック
- リトライ機能とエラー追跡
- 全操作（座席取得、予約、チェックイン、当日券発行、管理者編集）に対応

### システムステータス表示
- リアルタイムなシステム状態表示
- ユーザーフレンドリーな通知システム
- キーボードショートカット（Ctrl+Shift+S/F/R）

### 強化されたエラーハンドリング
- エラーの自動分類とユーザーフレンドリーなメッセージ
- エラー追跡と自動復旧機能
- グローバルエラーハンドリング

## 使用方法

### 自動動作
システムは自動的にオフライン機能の可用性を検出し、問題がある場合はフォールバックモードに移行します。ユーザーは特別な操作を行う必要はありません。

### 手動制御
必要に応じて、フォールバックモードを手動で制御できます：
- `Ctrl+Shift+F`: フォールバックモード切り替え
- `Ctrl+Shift+R`: オフライン機能再試行
- `Ctrl+Shift+S`: 詳細ステータス表示

## 利点

1. **堅牢性**: オフライン機能が使えなくてもシステムが正常に動作
2. **自動復旧**: エラー発生時の自動フォールバック
3. **ユーザビリティ**: 分かりやすいエラーメッセージと状態表示
4. **保守性**: 重複ファイルの削除により、保守が容易
5. **パフォーマンス**: 不要なファイルの削除により、読み込み速度向上

## 注意事項

1. **ブラウザ対応**: モダンブラウザでの動作を前提
2. **ネットワーク依存**: フォールバックモードではネットワーク接続が必要
3. **データ整合性**: オフライン機能とフォールバックモード間でのデータ整合性に注意
4. **パフォーマンス**: フォールバックモードでは直接サーバー通信のため、若干の遅延が発生する可能性
