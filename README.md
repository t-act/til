# Today I Learned

毎日の学習記録をつけるための個人リポジトリ。

## 構成

```
t-act/til/
  logs/
    YYYY/
      YYYY-MM.md                        # 月別の学習ログ
  reminder/                             # リマインダーの Cloudflare Worker
  .github/workflows/
    reminder.yml                        # reminder/ のテストとデプロイ
    commit-reminder.yml                 # 旧 Pushover リマインダー（併走中）
  docs/
    REQUIREMENTS.md                     # リマインダーの機能要件書
    DEPLOYMENT.md                       # LINE 通知への切り替え手順
```

## 学習ログ

[logs/](logs/) に年ごとのディレクトリを作り、その下に月別のファイルを置く。

## リマインダー

毎日の記録を続けるためのリマインド通知を、[reminder/](reminder/) の Cloudflare Worker から送る。

- 20:00 / 21:00 / 22:00 JST に起動し、その日の見出しが月別ファイルになければ LINE に通知する
- LINE の返信をそのまま箇条書きにして `logs/YYYY/YYYY-MM.md` に追記し、コミットする
- 詳細は [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)、デプロイ手順は [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) を参照

旧経路の Pushover 通知（`.github/workflows/commit-reminder.yml`）は、LINE の安定稼働を確認するまで併走させる。確認後に削除する。
