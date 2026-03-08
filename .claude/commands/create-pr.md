---
description: PR の説明文・レビュアー候補の提案を自動生成します
argument-hint: <pr-title>
---

# PR 作成: $ARGUMENTS

## 1. 差分解析
git diff --stat main...HEAD で変更統計を取得
変更ファイルをタイプ別・ディレクトリ別に分類

## 2. PR説明生成
以下のテンプレートで説明文を生成：
- 概要（変更の背景と目的）
- 変更内容（追加/変更/削除）
- 関連 Issue（closes #xxx）
- テスト方法（自動/手動）
- スクリーンショット欄
- チェックリスト

## 3. レビュアー提案
git log で変更ファイルの過去コミット者を取得
CODEOWNERS があれば参照

## 4. PR 作成
gh pr create --title "$ARGUMENTS" --body "生成した説明文" --assignee @me

