# チケット管理システム（座席予約・当日券発行）

このリポジトリは、文化祭やイベント向けの座席予約・チェックイン・当日券発行を行うシンプルな Web クライアントと、Google Apps Script（GAS）で構築されたバックエンドからなるシステムです。静的ホスティング可能なフロントエンド（HTML/CSS/JS）と、スプレッドシートをバックエンドとして使う運用に最適です。

## 主な機能
- 座席可視化と予約（通常モード）
- 予約済/確保/チェックイン待ち/チェックイン済のステータス表示
- 管理者モードでの複数席同時チェックイン
- 当日券モードでの空席自動割当（1〜6枚）
- サイドバーからのモード切り替え（通常/管理者/当日券）
- 自動更新（座席マップの定期リフレッシュ）と手動更新

## 画面構成
- `index.html`: 組選択ページ
- `timeslot.html`: 時間帯選択ページ
- `seats.html`: 座席選択・予約ページ（通常/管理者）
- `walkin.html`: 当日券発行ページ（当日券/管理者）

共通レイアウト/部品
- `styles.css`: 全体スタイル
- `sidebar.js` / `sidebar.css`: サイドバー、モード切替モーダル

機能別
- `seats-main.js` / `seats.css`: 座席マップ表示・予約・チェックイン
- `walkin-main.js` / `walkin.css`: 当日券発行、枚数選択（±ボタン対応）
- `timeslot-main.js` / `timeslot-schedules.js`: 時間帯選択（フロント固定データ）

バックエンド（GAS）
- `Code.gs`: API ルーター（doGet/doPost/JSONP 応答含む）と座席・予約・チェックイン・当日券処理
- `TimeSlotConfig.gs`: 時間帯設定（GAS 側）
- `SpreadsheetIds.gs`: 各公演のスプレッドシート ID 管理
- `system-setting.gs`: パスワード設定ユーティリティ

## 動作モード（サイドバー > モード変更）
- 通常モード: 座席予約が可能
- 管理者モード: 予約済/確保席のチェックインが可能、座席名表示
- 当日券モード: 空席の自動割当（1〜6席）

管理者/当日券モードはパスワード認証が必要です（GAS のスクリプトプロパティに保存）。

## アーキテクチャ概要
- フロントは静的ファイル群（HTML/CSS/ES Modules）。ビルド不要。
- バックエンドは GAS を JSONP で呼び出し（`api.js`）。CORS を回避しつつ、`callback` で応答を受け取ります。
- データストアは Google スプレッドシート。`SpreadsheetIds.gs` で対象スプレッドシートを公演別に切替。

## セットアップ手順
1) スプレッドシート準備
- 各公演（組/日/時間帯）に対応するスプレッドシートを用意し、座席シート名は `Seats` に統一。
- 列レイアウト（`Code.gs` の参照範囲に一致）
  - A列: 行ラベル（A〜E）
  - B列: 列番号（1〜12、E は 1〜6）
  - C列: ステータス（`空`/`確保`/`予約済`）
  - D列: 予約名（任意）
  - E列: チェックイン（`済` のみ使用）

2) GAS デプロイ
- Google Apps Script プロジェクトを作成し、`Code.gs` / `TimeSlotConfig.gs` / `SpreadsheetIds.gs` / `system-setting.gs` を貼り付け。
- `SpreadsheetIds.gs` の `SEAT_SHEET_IDS` を公演ごとに正しい ID へ更新。
- `system-setting.gs` の `setupPasswords()` を一度実行して、`ADMIN_PASSWORD` / `WALKIN_PASSWORD` を設定（必要に応じて値を変更）。
- ウェブアプリとしてデプロイ。
  - 実行する関数: `doGet`
  - アクセス権: 全員（匿名含む）/組織内など、運用ポリシーに合わせて設定
- デプロイ URL を控えておきます。

3) フロント設定
- `config.js` の `GAS_API_URL` を上記デプロイ URL に設定。
- ローカル開発時は、任意の静的サーバーで `index.html` を開いて動作確認できます。

## 使い方
1) 組選択（`index.html`）
- 組を選ぶと `timeslot.html?group=1` のように遷移します。

2) 時間帯選択（`timeslot.html`）
- 組に紐づく時間帯を表示（`timeslot-schedules.js` を参照）。選択するとモードに応じてページ遷移：
  - 通常: `seats.html?group=1&day=1&timeslot=A`
  - 当日券: `walkin.html?group=1&day=1&timeslot=A`
  - URL に `admin=true` が付与されている場合は管理者コンテキストが引き継がれます。

3) 座席ページ（`seats.html`）
- 通常モード: 空席を選択し「この席で予約する」。予約後はステータスが更新されます。
- 管理者モード: 予約済/確保席が選択可能となり、複数選択して「チェックイン」を実行可能。
- 自動更新: 30秒ごと（ユーザー操作時は一時停止）。手動更新ボタンもあり。

4) 当日券ページ（`walkin.html`）
- 枚数（1〜6）を ± ボタンまたは入力で指定し、「空席を探して当日券を発行する」。
- 空席があれば自動で確保し、割当席（単数/複数）を画面表示します。

## 設定とカスタマイズ
- API エンドポイント: `config.js` の `GAS_API_URL`
- デバッグログ: `config.js` の `DEBUG_MODE`
- 時間帯設定（フロント）: `timeslot-schedules.js` の `TIMESLOT_SCHEDULES`
- 時間帯設定（GAS）: `TimeSlotConfig.gs`（`_getAllTimeslotsForGroup` 経由で API 提供）
- スプレッドシート ID: `SpreadsheetIds.gs` の `SEAT_SHEET_IDS` / `LOG_SHEET_IDS`
- サイドバー/モード UI: `sidebar.js` / `sidebar.css`
- 座席レイアウト: `seats-main.js` の `layout`（行/列/通路位置など）
- 座席スタイル: `seats.css`（色、サイズ、凡例など）
- 当日券の枚数 UI: `walkin.css`（`walkin-qty-*` クラス）

変更のヒント
- 席行列構成を変える場合は、GAS 側の `isValidSeatId()`（行の最大席数）と、フロントの `layout`/描画に整合性を持たせてください。
- シート名を変更する場合は、`SpreadsheetIds.gs` の `TARGET_SEAT_SHEET_NAME` を合わせて変更します。
- モード認証の要件を変える場合は、`sidebar.js` の `applyModeChange()` と GAS 側 `verifyModePassword()` を調整します。

## パラメータとリンク例
- 組: `group=1` または `group=見本演劇`
- 日: `day=1|2`
- 時間帯: `timeslot=A|B|C|D|E|F`
- 管理者: `admin=true`

例:
- `seats.html?group=1&day=1&timeslot=A`
- `walkin.html?group=見本演劇&day=1&timeslot=B`

## エラーハンドリング
- フロント `api.js` は JSONP 呼び出し失敗時に `_reportError()` を実行し、UI にエラー表示を試みます。
- GAS 側は try/catch と `LockService` により同時更新を保護します。

## 開発・デプロイのフロー
1. GAS を用意し、スプレッドシート ID とパスワードを設定、ウェブアプリとしてデプロイ。
2. `config.js` の `GAS_API_URL` を更新。
3. 任意の静的ホスティング（GitHub Pages など）にフロントを配置。

ローカル動作確認
- 簡易サーバーで OK（例: VS Code Live Server、`npx serve` など）。

## セキュリティ注意
- パスワードは GAS のスクリプトプロパティに保存。リポジトリに平文で置かない。
- 公開レベルは運用方針に従って最小権限にする。

## ライセンス
- リポジトリの `LICENSE` を参照。

## ファイル一覧（要点）
- `index.html` / `index-main.js`: 組選択 + サイドバー読込
- `timeslot.html` / `timeslot-main.js` / `timeslot-schedules.js`: 時間帯選択（フロント固定データ）
- `seats.html` / `seats-main.js` / `seats.css`: 座席表示・予約・チェックイン
- `walkin.html` / `walkin-main.js` / `walkin.css`: 当日券発行
- `sidebar.js` / `sidebar.css`: サイドバーとモード切替
- `api.js` / `config.js`: GAS API 呼び出し（JSONP）と設定
- `Code.gs` / `TimeSlotConfig.gs` / `SpreadsheetIds.gs` / `system-setting.gs`: GAS 側ロジック
