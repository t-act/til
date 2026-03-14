# Today I Learned

## 構成

- `YYYY-MM.md` — 月別の学習ログ。日付ごとにその日学んだことを記録
- `.github/workflows/commit-reminder.yml` — コミットリマインダー

## コミットリマインダー

GitHub Actions で毎日のコミット習慣を維持するためのリマインド通知を送信する。

- 未コミット時に Pushover 経由で iPhone に通知
- 1日3回、段階的にリマインド（20:00 / 22:00 / 23:00 JST）
- 詳細は [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) を参照
