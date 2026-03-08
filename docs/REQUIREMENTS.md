# 機能要件書: GitHub コミットリマインダー

## 背景・目的

毎日の学習記録を残すための個人リポジトリ `t-act/til` を運用しているが、最近コミットし忘れが多発している。毎日のコミット習慣を維持するため、未コミット時に iPhone へリマインド通知を送る仕組みを導入する。

## システム構成

| 要素 | 技術選定 | 備考 |
|------|----------|------|
| 対象リポジトリ | `t-act/til` | ワークフローも同リポジトリに配置 |
| スケジューラー | GitHub Actions (cron) | 1日2回実行 |
| コミット判定 | GitHub REST API | `GITHUB_TOKEN`（自動提供）で認証 |
| 通知送信 | Pushover API | iPhone ネイティブ通知 |
| コスト | $5（買い切り） | Pushover iOS アプリ購入のみ |

## アーキテクチャ

```
[GitHub Actions cron]
  ├─ 20:00 JST ─→ コミット判定 ─→ 未コミット → Pushover（軽めの通知）
  ├─ 22:00 JST ─→ コミット判定 ─→ 未コミット → Pushover（強めの通知）
  └─ 23:00 JST ─→ コミット判定 ─→ 未コミット → Pushover（最終通知）
```

---

## 機能要件

### FR-1: 定期実行（段階的リマインド）

- GitHub Actions の `schedule` トリガーで **1日3回** 実行する
- 1回目: **20:00 JST**（UTC 11:00）— 軽めのリマインド
- 2回目: **22:00 JST**（UTC 13:00）— 強めのリマインド
- 3回目: **23:00 JST**（UTC 14:00）— 最終リマインド
- `workflow_dispatch` による手動実行にも対応する
- cron は3つの schedule を定義し、ワークフロー内で現在時刻から通知トーンを判定する

### FR-2: コミット判定

- 実行日（JST基準）にコミットが **1件以上あるか** を判定する
- 判定対象は **デフォルトブランチ（main）** のみ
- GitHub API の `repos/t-act/til/commits` エンドポイントを使用する
- `since` パラメータに当日 00:00:00 JST（= UTC 前日 15:00:00）を指定する
- コミットが1件以上ある場合は **後続ステップをスキップ** して正常終了する

### FR-3: 通知送信（段階的）

- FR-2 の結果、コミットが **0件の場合のみ** 通知を送信する
- Pushover API（`https://api.pushover.net/1/messages.json`）に HTTP POST する

#### 20:00 の通知（軽め）

| 項目 | 値 |
|------|-----|
| タイトル | `📝 TIL リマインダー` |
| 本文 | `今日はまだ t-act/til にコミットしていません。時間があるうちに書きましょう！` |
| 優先度 | Normal (0) |

#### 22:00 の通知（強め）

| 項目 | 値 |
|------|-----|
| タイトル | `⚠️ TIL 未コミット！` |
| 本文 | `今日の t-act/til へのコミットがまだありません！今日中に記録を残しましょう！` |
| 優先度 | High (1) |

#### 23:00 の通知（最終）

| 項目 | 値 |
|------|-----|
| タイトル | `🚨 TIL 最終リマインド！` |
| 本文 | `今日の t-act/til へのコミットがまだありません！日付が変わる前に記録を残しましょう！` |
| 優先度 | High (1) |

- 優先度 High (1) は Pushover のデフォルト静音設定を無視して通知音を鳴らす

### FR-4: エラーハンドリング

- GitHub API / Pushover API の呼び出しが失敗した場合、GitHub Actions のジョブを失敗させる
- API レスポンスのステータスコードをログに出力する

---

## 非機能要件

### NFR-1: セキュリティ

- Pushover の認証情報は GitHub Secrets に格納する
  - `PUSHOVER_API_TOKEN`: Pushover アプリケーション API Token
  - `PUSHOVER_USER_KEY`: Pushover ユーザーキー
- ワークフロー内でシークレットをログに出力しない
- `GITHUB_TOKEN` は Actions が自動提供するため、Secrets への手動登録は不要

### NFR-2: 実行環境

- ランナー: `ubuntu-latest`
- 外部依存: `curl`, `jq`（ubuntu-latest にプリインストール済み）
- 追加パッケージのインストール不要

### NFR-3: コスト

- GitHub Actions: パブリックリポジトリは無料（プライベートでも月2,000分の無料枠内）
- 1回の実行は1分以内で完了する想定（月60分程度 = 2回/日 × 30日）
- Pushover: iOS アプリ $5（買い切り）のみ

### NFR-4: 保守性

- ワークフローは `.github/workflows/commit-reminder.yml` の1ファイルで完結する
- 通知メッセージはワークフロー内にハードコードする（外部設定ファイル不要）

---

## Secrets 一覧

| Secret 名 | 説明 | 取得元 |
|-----------|------|--------|
| `PUSHOVER_API_TOKEN` | Pushover アプリケーション API Token | https://pushover.net/apps/build で作成 |
| `PUSHOVER_USER_KEY` | Pushover ユーザーキー | https://pushover.net ダッシュボードに表示 |

---

## ファイル構成

```
t-act/til/
  .github/
    workflows/
      commit-reminder.yml    # GitHub Actions ワークフロー（本体）
  README.md
  ...（学習記録ファイル）
```
