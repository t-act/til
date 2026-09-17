# Today I Learned

毎日の学習記録をつけるための個人リポジトリ。

## 構成

```
t-act/til/
  logs/
    YYYY/
      YYYY-MM.md                      # 月別の学習ログ
  .github/workflows/commit-reminder.yml  # コミットリマインダー
  docs/
    REQUIREMENTS.md                   # コミットリマインダーの機能要件書
```

## 学習ログ

[logs/](logs/) に年ごとのディレクトリを作り、その下に月別のファイルを置く。

## コミットリマインダー

GitHub Actions で毎日のコミット習慣を維持するためのリマインド通知を送信する。

- 未コミット時に Pushover 経由で iPhone に通知
- 1日3回、段階的にリマインド（20:00 / 21:00 / 22:00 JST）
- 詳細は [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) を参照
