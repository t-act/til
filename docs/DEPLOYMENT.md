# デプロイ手順: LINE 通知への切り替え

学習ログのリマインダーを、Pushover（GitHub Actions）から LINE（Cloudflare Workers）へ切り替えるための手順。
Worker の実装は [`reminder/`](../reminder/) にある。

この文書に秘密情報の値そのものは書かない。どこで取得するかだけを書く。

## 切り替えで何が変わるか

| | 旧（Pushover） | 新（LINE） |
|---|---|---|
| 実行基盤 | GitHub Actions cron | Cloudflare Workers cron |
| 実行時刻 | 19:13 / 20:37 / 21:53 JST | 20:00 / 21:00 / 22:00 JST |
| 未記録の判定 | 当日 main にコミットがあるか | 月別ファイルに当日の見出し（`MMDD`）があるか |
| 通知先 | Pushover（iPhone） | LINE |
| 記録の手段 | 手元で編集してコミット | LINE の返信を Worker が `logs/YYYY/YYYY-MM.md` に追記してコミット |
| 定義ファイル | `.github/workflows/commit-reminder.yml` | `reminder/`（cron は `reminder/wrangler.jsonc`） |

## 前提

- Cloudflare アカウント（Workers の無料枠で足りる）
- LINE Developers アカウント。ビジネスIDに LINE アカウントを連携しておく（連携していないと ［あなたのユーザーID］ が表示されない）
- Node.js 22 以上（`reminder/package.json` の `engines`）

## 1. LINE 側を用意する

1. LINE Developers コンソールでプロバイダーを作り、Messaging API チャネルを作成する。
2. 自分の LINE アカウントで、そのチャネルの公式アカウントを友だち追加する。定時通知の宛先になるため、友だちになっていないと push が届かない。
3. ［Messaging API設定］タブで、あいさつメッセージと応答メッセージ（自動応答）をオフにする。Worker 自身が返信するため、切らないと二重に届く。
4. 同じタブで Webhook の利用をオンにする。URL の設定は手順 4 で行う。

## 2. secret を集める

Worker の secret として登録するのは次の 4 つ。`reminder/src/env.ts` の定義と対応する。

| secret | 用途 | 取得元 |
|---|---|---|
| `GITHUB_TOKEN` | Contents API でログファイルを読み書きする | GitHub の Settings > Developer settings > Personal access tokens > Fine-grained tokens。Repository access を `t-act/til` だけに絞り、Permissions の Contents を Read and write にする |
| `LINE_CHANNEL_ID` | アクセストークン発行の `client_id` | LINE Developers の該当チャネル ［チャネル基本設定］タブのチャネルID |
| `LINE_CHANNEL_SECRET` | アクセストークン発行の `client_secret`、および webhook の署名検証 | 同じタブのチャネルシークレット |
| `LINE_USER_ID` | 通知の宛先と、webhook の送信者の照合 | 同じタブの ［あなたのユーザーID］。`U` で始まる33文字 |

アクセストークンは、チャネルIDとシークレットから 15 分だけ有効なステートレストークンを都度発行する（`reminder/src/token.ts`）。長期トークンを使う場合だけ、［Messaging API設定］タブで発行して `LINE_CHANNEL_ACCESS_TOKEN` を追加で登録する。登録があればそちらを優先する。

秘密でない設定（`GITHUB_REPO` / `GITHUB_BRANCH` / `JOURNAL_DIR` / `ENTRY_CUTOFF_HOUR`）は `reminder/wrangler.jsonc` の `vars` にあるので、登録は不要。

## 3. wrangler で登録してデプロイする

```sh
cd reminder
npm ci
npm run typecheck
npm test

npx wrangler login
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put LINE_CHANNEL_ID
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put LINE_USER_ID
npx wrangler secret list   # 名前だけ確認できる。値は表示されない

npm run deploy
```

- cron は `wrangler.jsonc` の `triggers.crons`（UTC の 11 / 12 / 13 時 = JST の 20 / 21 / 22 時）にあるので、デプロイすると登録される。
- デプロイの出力に出る `https://til-reminder.<subdomain>.workers.dev` を控える。次の手順で使う。
- ローカルで動かす場合は `npm run dev`。秘密情報は `reminder/.dev.vars` に置く（`.gitignore` 済み）。

## 4. Webhook URL を設定する

1. LINE Developers の ［Messaging API設定］タブで、Webhook URL に手順 3 の URL を貼る。
2. Verify を押して Success になることを確認する。
3. Webhook の利用がオンになっていることを確認する。

Worker は POST 以外に 405 を返すため、ブラウザで URL を開くと 405 になる。これは正常。

## 5. GitHub Actions からの自動デプロイを有効にする

`.github/workflows/reminder.yml` が `reminder/**` の変更を拾って、typecheck とテストの後にデプロイする。次の 2 つをリポジトリの Settings > Secrets and variables > Actions に登録する。

| secret | 取得元 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare ダッシュボードの My Profile > API Tokens。Edit Cloudflare Workers テンプレートで作成する |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare ダッシュボードの Workers & Pages に表示されるアカウントID |

以降、`reminder/` の変更を main に入れれば自動でデプロイされる。学習ログのコミットではデプロイは走らない。

## 6. 動作を確認する

別のターミナルで `npx wrangler tail` を開いておくと、どこで止まっているかが分かる。

### 定時通知

当日分の見出しが月別ファイルにあると通知は飛ばない（`reminder/src/journal.ts` の `hasHeader`）。未記録の状態で試す。

```sh
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+11+*+*+*"
```

LINE に「今日の記録がまだありません。…」が届き、`No` のクイックリプライが付く。cron の文字列ごとに文面が変わる（`reminder/src/index.ts` の `REMINDERS`）。

### 返信からコミットまで

LINE でその日やったことを返信する。確認するのは次の 3 点。

1. LINE に `YYYY-MM-DD に記録しました。` と、記録した箇条書きが返る。
2. `logs/YYYY/YYYY-MM.md` に `MMDD` の見出しと `- ` で始まる行が増えている。
3. main に `update: YYYY-MM-DD` のコミットが載っている。

失敗した場合は「記録に失敗しました。」と理由が LINE に返る。`GITHUB_TOKEN` の権限不足はここで分かる。

### 署名の検証

LINE 以外からの POST は 401 で弾く。

```sh
curl -i -X POST https://til-reminder.<subdomain>.workers.dev -d '{}'
```

### 日付の境界

`ENTRY_CUTOFF_HOUR` が 6 なので、06:00 JST より前の返信は前日分として記録される。日付をまたいで試すときはこれを踏まえる。

## 7. 旧通知経路（Pushover）を止める

旧ワークフローは切り替えと同時には消さない。LINE 側の安定稼働を確認してから削除する。

確認できるまでは両方が動く。旧は 19:13 / 20:37 / 21:53 JST、新は 20:00 / 21:00 / 22:00 JST に起動するので、未記録の日は Pushover と LINE の両方に届く。判定基準も違い、旧は当日のコミットの有無、新は当日の見出しの有無を見る。LINE の返信で記録した日は両方とも黙る。

1. `.github/workflows/commit-reminder.yml` を削除する。それまでの間に Pushover 側だけ止めたい場合は、Actions 画面の Disable workflow で止める。
2. リポジトリの Settings > Secrets and variables > Actions から `PUSHOVER_API_TOKEN` と `PUSHOVER_USER_KEY` を削除する。
3. Pushover 側のアプリケーション（API Token）が他で使っていなければ削除する。
4. README.md の「コミットリマインダー」節と `docs/REQUIREMENTS.md` は Pushover 前提のままなので、LINE 版に書き換える。

## つまずきやすいところ

| 症状 | 見るところ |
|---|---|
| ［あなたのユーザーID］が表示されない | ビジネスIDに LINE アカウントを連携していない |
| 定時通知が来ない | デプロイしないと cron は登録されない。`npx wrangler deployments list` で確認する。当日分の見出しがある日は通知しない仕様であることも確認する |
| 返信しても記録されない | `wrangler tail` で webhook が届いているかを見る。届いていれば `GITHUB_TOKEN` の Contents 権限を疑う |
| webhook が 401 になり続ける | `LINE_CHANNEL_SECRET` が別チャネルのものになっている |
| 通知が二重に届く | LINE 側の自動応答が切れていない、または旧ワークフローが動いたままになっている |
| `update:` のコミットが競合する | 手元から同時にコミットすると sha が古くなる。2回までは自動で取り直す（`reminder/src/index.ts` の `CONFLICT_RETRY_LIMIT`） |
