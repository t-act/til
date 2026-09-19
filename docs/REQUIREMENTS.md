# 機能要件書: 学習ログリマインダー

## 背景・目的

毎日の学習記録を残すための個人リポジトリ `t-act/til` を運用しているが、記録し忘れが多発している。習慣を維持するため、未記録の日に LINE へリマインド通知を送る。あわせて、LINE の返信をそのまま学習ログに追記できるようにし、記録のために手元の環境を開く必要をなくす。

旧経路の Pushover 通知（`.github/workflows/commit-reminder.yml`）は、LINE の安定稼働を確認するまで併走させる。停止手順は [DEPLOYMENT.md](DEPLOYMENT.md) の「旧通知経路（Pushover）を止める」を参照。

## システム構成

| 要素 | 技術選定 | 備考 |
|------|----------|------|
| 対象リポジトリ | `t-act/til` | Worker の実装も同リポジトリの `reminder/` に置く |
| 実行基盤 | Cloudflare Workers | `til-reminder` |
| スケジューラー | Workers Cron Triggers | 1日3回 |
| 記録の判定 | GitHub Contents API | fine-grained PAT で認証 |
| 通知・受信 | LINE Messaging API | push メッセージと webhook |
| 記録の書き込み | GitHub Contents API | `logs/YYYY/YYYY-MM.md` へ追記してコミット |
| コスト | 無料 | Workers 無料枠と LINE のフリープランの範囲 |

## アーキテクチャ

```
[Workers Cron]
  ├─ 20:00 JST ─→ 当日の見出しを確認 ─→ なければ LINE へ通知（1段目）
  ├─ 21:00 JST ─→ 同上 ─→ なければ LINE へ通知（2段目）
  └─ 22:00 JST ─→ 同上 ─→ なければ LINE へ通知（3段目）

[LINE の返信] ─→ [Worker の webhook] ─→ 署名の検証 ─→ 箇条書きに変換
                                                      └─→ logs/YYYY/YYYY-MM.md へ追記してコミット ─→ LINE へ結果を返信
```

---

## 機能要件

### FR-1: 定期実行（段階的リマインド）

- Workers Cron Triggers で **1日3回** 実行する
- 1回目: **20:00 JST**（UTC 11:00）
- 2回目: **21:00 JST**（UTC 12:00）
- 3回目: **22:00 JST**（UTC 13:00）
- cron は `reminder/wrangler.jsonc` の `triggers.crons` に定義する
- 通知の段階は、実行時刻ではなく **起動した cron の予定時刻** で判定する。起動が遅れた日に段階が入れ替わらないようにするため
- 対応する cron が見つからない場合は既定の文面を使う

### FR-2: 未記録の判定

- 記録先の月別ファイル `logs/YYYY/YYYY-MM.md` を GitHub Contents API で取得する
- ファイル内に当日の日付見出し（`MMDD` 形式、例: `0913`）の行があるかを判定する
- 見出しがある場合は **通知を送らず** 正常終了する
- ファイルが存在しない場合は未記録として扱う
- 判定対象のブランチは `GITHUB_BRANCH`（既定は `main`）

### FR-3: 通知送信（段階的）

- FR-2 の結果、当日の見出しが **ない場合のみ** LINE の push メッセージを送信する
- 宛先は `LINE_USER_ID`
- 返信を促すクイックリプライ（`No`）を添える。記録なしの日をワンタップで残せるようにするため

| 段階 | 本文 |
|------|------|
| 20:00 | `今日の記録がまだありません。書いたら、この返信で送ってください。` |
| 21:00 | `今日の記録がまだありません。何をしたか、一言返してください。` |
| 22:00 | `今日の記録がまだありません。日付が変わる前に返しましょう。` |
| 既定 | `今日の記録がまだありません。` |

### FR-4: 返信の受信

- Worker の HTTP エンドポイントで LINE の webhook を受ける
- `POST` 以外のメソッドには **405** を返す
- `x-line-signature` をチャネルシークレットで HMAC-SHA256 検証し、一致しない場合は **401** を返す。LINE 以外からの POST で勝手にコミットされないようにするため
- 署名の比較は、長さの比較と全バイトの XOR で行う
- 処理するのは次の条件をすべて満たすイベントのみとし、それ以外は無視する
  - `type` が `message`、`message.type` が `text`
  - `source.userId` が `LINE_USER_ID` と一致する
  - `replyToken` を持つ
- 記録に失敗した場合も **200** を返す。LINE は 200 以外を受け取ると再送するため

### FR-5: 学習ログへの追記

- 返信の本文を行単位で箇条書きに変換する
  - 前後の空白と、行頭の `-` `*` `・` を落とす
  - 空行は捨てる
- 変換後に1行も残らない場合は追記せず、`記録する内容がありませんでした。` と返信する
- 記録先は `logs/YYYY/YYYY-MM.md`（`JOURNAL_DIR` は `logs`）
- 当日の日付見出しがある場合は、**その見出しに続く箇条書きの末尾** に差し込む。見出しが必ずしもファイルの最後にないため
- 見出しがない場合は、空行を挟んでファイルの末尾に新しい見出しと箇条書きを作る
- コミットメッセージは `update: YYYY-MM-DD`
- コミット先は `GITHUB_BRANCH`

### FR-6: 記録日の判定

- 記録先の日付は JST で判定する
- `ENTRY_CUTOFF_HOUR`（既定は 6）より前の時刻の返信は **前日分** として記録する。深夜の返信を前日の記録として残すため
- 定期実行の FR-2 も同じ基準で日付を決める

### FR-7: 結果の返信

- 追記に成功した場合、`YYYY-MM-DD に記録しました。` に続けて記録した箇条書きを返信する
- 失敗した場合、`記録に失敗しました。` に続けてエラーの内容を返信する。失敗を黙って捨てるとトークンの期限切れに気づけないため

### FR-8: 競合時の再試行

- 取得した `sha` が古く、書き込みが 409 または 422 で弾かれた場合は、ファイルを取り直して追記をやり直す
- 再試行は **2回** まで。それを超えた場合は FR-7 の失敗として返信する

### FR-9: アクセストークンの発行

- チャネルIDとチャネルシークレットから、`client_credentials` でステートレスアクセストークン（有効期間15分）を発行して使う。LINE が長期トークンを推奨していないため
- 発行したトークンは有効期限の **60秒前** まで再利用する
- `LINE_CHANNEL_ACCESS_TOKEN` が登録されている場合はそれを優先し、発行を行わない

---

## 非機能要件

### NFR-1: セキュリティ

- 秘密情報は Worker の secret として登録する（`wrangler secret put`）
- ローカル実行時は `reminder/.dev.vars` に置く。`.gitignore` で追跡しない
- 秘密でない設定は `reminder/wrangler.jsonc` の `vars` に置く
- `GITHUB_TOKEN` は fine-grained PAT とし、対象リポジトリを `t-act/til` のみ、権限を Contents の Read and write に絞る
- webhook は FR-4 の署名検証を通らないリクエストを受け付けない

### NFR-2: 実行環境

- 実行基盤: Cloudflare Workers
- 開発・デプロイには Node.js 22 以上が必要
- Wrangler の `observability` を有効にし、`wrangler tail` でログを追えるようにする

### NFR-3: コスト

- Cloudflare Workers: 無料枠内（1日3回の cron と webhook のみ）
- LINE Messaging API: フリープランの無料メッセージ数の範囲内
- GitHub Actions: `reminder/` を変更したときだけ実行する

### NFR-4: 保守性

- Worker の実装は `reminder/` に閉じる
- 通知の文面は実装内にハードコードする（外部設定ファイル不要）
- `reminder/**` または `.github/workflows/reminder.yml` の変更で `npm run typecheck` と `npm test` を実行する。学習ログのコミットでは実行しない
- main への push で Cloudflare へ自動デプロイする。pull request では検査のみ行う

---

## Secrets 一覧

### Worker の secret

| secret 名 | 説明 | 取得元 |
|-----------|------|--------|
| `GITHUB_TOKEN` | Contents API の認証 | GitHub の Settings > Developer settings > Personal access tokens > Fine-grained tokens |
| `LINE_CHANNEL_ID` | アクセストークン発行の `client_id` | LINE Developers の［チャネル基本設定］タブ |
| `LINE_CHANNEL_SECRET` | アクセストークン発行の `client_secret`、署名の検証 | 同じタブ |
| `LINE_USER_ID` | 通知の宛先、送信者の照合 | 同じタブの［あなたのユーザーID］ |
| `LINE_CHANNEL_ACCESS_TOKEN` | 長期トークンを使う場合のみ（任意） | ［Messaging API設定］タブ |

### GitHub Actions の secret

| secret 名 | 説明 | 取得元 |
|-----------|------|--------|
| `CLOUDFLARE_API_TOKEN` | Worker のデプロイ | Cloudflare の My Profile > API Tokens（Edit Cloudflare Workers テンプレート） |
| `CLOUDFLARE_ACCOUNT_ID` | デプロイ先のアカウント | Cloudflare の Workers & Pages に表示されるアカウントID |

旧経路の `PUSHOVER_API_TOKEN` と `PUSHOVER_USER_KEY` は、併走をやめる際に削除する。

---

## ファイル構成

```
t-act/til/
  reminder/
    src/
      index.ts        # 定時通知と webhook のハンドラ
      day.ts          # 日付の区切りとファイルのパス
      journal.ts      # 月別ファイルへの追記
      github.ts       # Contents API の呼び出し
      line.ts         # Messaging API の呼び出しと署名の検証
      token.ts        # アクセストークンの発行
      base64.ts
      env.ts
    test/
    wrangler.jsonc    # cron と vars
  .github/workflows/
    reminder.yml      # テストとデプロイ
    commit-reminder.yml  # 旧 Pushover リマインダー（併走中）
  logs/
    YYYY/
      YYYY-MM.md      # 月別の学習ログ
  docs/
    REQUIREMENTS.md
    DEPLOYMENT.md
```
