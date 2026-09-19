export type Env = {
  // wrangler.jsonc の vars
  GITHUB_REPO: string
  GITHUB_BRANCH: string
  JOURNAL_DIR: string
  ENTRY_CUTOFF_HOUR: number
  // wrangler secret put で登録する
  GITHUB_TOKEN: string
  LINE_CHANNEL_ID: string
  LINE_CHANNEL_SECRET: string
  LINE_USER_ID: string
  // 長期のチャネルアクセストークンを使う場合だけ登録する。
  // 登録がなければチャネルIDとシークレットからステートレストークンを発行する
  LINE_CHANNEL_ACCESS_TOKEN?: string
}
