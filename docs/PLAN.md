# 実装計画: GitHub コミットリマインダー

基づく文書: `REQUIREMENTS.md`, `TODO.md`

---

## 前提

- Phase 1（Pushover セットアップ）と Phase 2（GitHub Secrets 登録）はユーザーの手動作業
- 本計画は **Phase 3（ワークフロー実装）** を対象とする
- 成果物: `.github/workflows/commit-reminder.yml`（1ファイル）

---

## 実装ステップ

### Step 1: ワークフロー定義とトリガー設定

ファイル: `.github/workflows/commit-reminder.yml`

- `name: Commit Reminder`
- トリガー:
  - `schedule`: 3つの cron 定義
    - `0 11 * * *` (20:00 JST)
    - `0 13 * * *` (22:00 JST)
    - `0 14 * * *` (23:00 JST)
  - `workflow_dispatch`: 手動実行対応
- ランナー: `ubuntu-latest`
- 権限: `contents: read`（コミット取得に必要な最小権限）

### Step 2: 通知レベル判定ステップ

`determine-level` ステップ:

- 現在の UTC 時刻の「時」を取得（`date -u +%H`）
- 時刻に応じて `level` を output に設定:
  - `11` → `gentle`
  - `13` → `urgent`
  - `14` → `final`
  - その他（手動実行等） → `gentle`（デフォルト）

### Step 3: コミット判定ステップ

`check-commits` ステップ:

- `since` パラメータの算出:
  - JST 当日 00:00 = UTC 前日 15:00
  - `date -u -d "today 15:00" --date="yesterday"` 等で ISO 8601 形式を生成
- GitHub API 呼び出し:
  ```
  GET /repos/t-act/til/commits?sha=main&since={since}&per_page=1
  ```
  - `per_page=1` で十分（存在確認のみ）
  - `GITHUB_TOKEN` で認証
- `jq` でレスポンス配列の長さを取得
- 結果を `has_commits` output に設定（`true` / `false`）
- API エラー時はステータスコードをログ出力し、ジョブを失敗させる

### Step 4: Pushover 通知送信ステップ

`send-notification` ステップ:

- 実行条件: `steps.check-commits.outputs.has_commits == 'false'`
- `level` に応じた変数設定（シェル case 文）:

| level | title | message | priority |
|-------|-------|---------|----------|
| `gentle` | `📝 TIL リマインダー` | `今日はまだ t-act/til にコミットしていません。時間があるうちに書きましょう！` | `0` |
| `urgent` | `⚠️ TIL 未コミット！` | `今日の t-act/til へのコミットがまだありません！今日中に記録を残しましょう！` | `1` |
| `final` | `🚨 TIL 最終リマインド！` | `今日の t-act/til へのコミットがまだありません！日付が変わる前に記録を残しましょう！` | `1` |

- `curl` で Pushover API に POST:
  ```
  curl -s -o /dev/null -w "%{http_code}" \
    --form-string "token=$PUSHOVER_API_TOKEN" \
    --form-string "user=$PUSHOVER_USER_KEY" \
    --form-string "title=$TITLE" \
    --form-string "message=$MESSAGE" \
    --form-string "priority=$PRIORITY" \
    https://api.pushover.net/1/messages.json
  ```
- レスポンスコード検証: 200 以外は `exit 1`

---

## ジョブフロー図

```
[cron / workflow_dispatch]
  │
  ├── determine-level  → level (gentle|urgent|final)
  │
  ├── check-commits    → has_commits (true|false)
  │
  └── send-notification (if has_commits == false)
        └── Pushover API POST (title/message/priority は level で分岐)
```

---

## 注意事項

- GitHub Actions の cron は UTC 基準。JST → UTC の変換に注意
- cron の実行タイミングには数分〜数十分の遅延がありうる（時刻判定は「時」単位で行うため影響なし）
- `GITHUB_TOKEN` は Actions が自動提供。追加設定不要
- シークレットはログに出力しない（`curl` の `-s` と `--form-string` で対応）
