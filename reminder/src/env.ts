export type Env = {
  // wrangler.jsonc の vars
  GITHUB_REPO: string
  GITHUB_BRANCH: string
  JOURNAL_DIR: string
  ENTRY_CUTOFF_HOUR: number
  // wrangler secret put で登録する
  GITHUB_TOKEN: string
  LINE_CHANNEL_SECRET: string
  LINE_CHANNEL_ACCESS_TOKEN: string
  LINE_USER_ID: string
}
