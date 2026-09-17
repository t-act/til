# til-reminder

学習ログの記録を促す Cloudflare Worker。

- 20:00 / 21:00 / 22:00 JST に起動し、その日の見出しが月別ファイルになければ LINE に通知する
- LINE の返信を受け取り、`logs/YYYY/YYYY-MM.md` に追記してコミットする
- 06:00 JST より前の返信は前日分として記録する

## 構成

```
reminder/
  src/
    index.ts      # 定時通知と webhook のハンドラ
    day.ts        # 日付の区切りとファイルのパス
    journal.ts    # 月別ファイルへの追記
    github.ts     # Contents API の呼び出し
    line.ts       # Messaging API の呼び出しと署名の検証
    base64.ts
  test/
```

## 開発

Wrangler の実行には Node.js 22 以上が必要。

```sh
npm install
npm test
npm run typecheck
npm run dev      # ローカル実行。秘密情報は .dev.vars に置く
```

## 設定

`wrangler.jsonc` の `vars` に、リポジトリ名やログの置き場所を書いている。秘密情報は Worker の secret として登録する。

| secret | 取得元 |
|---|---|
| `GITHUB_TOKEN` | GitHub の fine-grained personal access token。対象を `t-act/til` だけに絞り、Contents を Read and write にする |
| `LINE_CHANNEL_SECRET` | LINE Developers コンソールの Basic settings |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers コンソールの Messaging API settings で発行する長期トークン |
| `LINE_USER_ID` | LINE Developers コンソールの Basic settings に表示される Your user ID |

```sh
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npx wrangler secret put LINE_USER_ID
```

## セットアップ

1. LINE 公式アカウントを作り、Messaging API を有効にする
2. 自分のアカウントでその公式アカウントを友だちに追加する
3. 上の secret を登録する
4. `npm run deploy` でデプロイし、表示された URL を LINE の Webhook URL に設定して Verify する
5. 自動応答メッセージ（あいさつ・応答）を切る。Worker の返信と二重になるため
6. GitHub の Secrets に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を登録する。以降は `reminder/` の変更を main に入れると自動でデプロイされる

## 運用

```sh
npx wrangler tail                       # 実行中のログを見る
npx wrangler deploy --dry-run           # 設定の確認
```

通知が届かないときは、まず `wrangler tail` を開いた状態で LINE に返信し、webhook が届いているかを確かめる。
