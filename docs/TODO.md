# TODO: GitHub コミットリマインダー（t-act/til）

機能要件書: `REQUIREMENTS.md` を参照のこと。

---

## Phase 1: Pushover セットアップ（手動作業）

- [ ] Pushover iOS アプリを購入・インストール（$5、7日間無料トライアルあり）
- [ ] https://pushover.net でアカウント作成、iOS デバイスを登録
- [ ] https://pushover.net/apps/build で Application を作成
  - Name: `TIL Reminder`（任意）
  - API Token を控える
- [ ] ダッシュボードで User Key を確認・控える

## Phase 2: GitHub Secrets 登録（手動作業）

- [ ] `t-act/til` リポジトリの Settings → Secrets and variables → Actions を開く
- [ ] 以下の Repository secrets を登録:
  - [ ] `PUSHOVER_API_TOKEN` — Phase 1 で取得した API Token
  - [ ] `PUSHOVER_USER_KEY` — Phase 1 で確認した User Key

## Phase 3: ワークフロー実装（Claude Code）

- [ ] `.github/workflows/commit-reminder.yml` を作成
- [ ] schedule トリガーの定義
  - [ ] cron 1: `0 11 * * *`（20:00 JST = UTC 11:00）
  - [ ] cron 2: `0 13 * * *`（22:00 JST = UTC 13:00）
  - [ ] cron 3: `0 14 * * *`（23:00 JST = UTC 14:00）
  - [ ] `workflow_dispatch` トリガー
- [ ] ステップ1: 通知レベルの判定
  - [ ] 現在時刻（UTC）から通知レベルを決定する
    - UTC 11:xx → `level=gentle`（20:00 JST）
    - UTC 13:xx → `level=urgent`（22:00 JST）
    - UTC 14:xx → `level=final`（23:00 JST）
    - 手動実行 → `level=gentle`（デフォルト）
  - [ ] `level` を GitHub Actions の output に設定する
- [ ] ステップ2: 今日のコミット有無を判定
  - [ ] 当日 00:00 JST（= UTC 前日 15:00）を `since` として算出
  - [ ] GitHub API `GET /repos/{owner}/{repo}/commits?sha=main&since=...` を呼び出し
  - [ ] `jq` でコミット件数を取得
  - [ ] 0件なら `has_commits=false`、1件以上なら `has_commits=true` を output に設定
- [ ] ステップ3: Pushover 通知送信
  - [ ] 条件: `steps.check.outputs.has_commits == 'false'`
  - [ ] `level` に応じてタイトル・本文・優先度を分岐
    - gentle: `📝 TIL リマインダー` / priority=0
    - urgent: `⚠️ TIL 未コミット！` / priority=1
    - final: `🚨 TIL 最終リマインド！` / priority=1
  - [ ] `curl` で Pushover API に POST
  - [ ] レスポンスのステータスコードを検証（200以外はエラー）

## Phase 4: テスト

- [ ] `workflow_dispatch` で手動実行 → 通知が iPhone に届くことを確認
- [ ] コミットがある状態で手動実行 → 通知が来ないことを確認
- [ ] cron 実行を待って自動実行を確認（翌日以降）
- [ ] Pushover の Secrets を意図的に間違えて実行 → ジョブが失敗することを確認

## Phase 5: 調整（任意）

- [ ] 通知時刻の変更（cron の時刻を好みに合わせて調整）
- [ ] 通知メッセージの文面カスタマイズ
- [ ] Pushover の通知音カスタマイズ（`sound` パラメータ）
