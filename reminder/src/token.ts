import type { Env } from './env'

const TOKEN_ENDPOINT = 'https://api.line.me/oauth2/v3/token'
// 期限ぎりぎりのトークンで 401 を食わないよう、少し手前で取り直す
const REFRESH_MARGIN_MS = 60_000

let cached: { token: string; expiresAt: number } | null = null

/**
 * LINE のアクセストークンを返す。長期トークンが登録されていなければ、
 * チャネルIDとシークレットからステートレストークン（15分）を発行する。
 */
export async function accessToken(env: Env, now: number = Date.now()): Promise<string> {
  if (env.LINE_CHANNEL_ACCESS_TOKEN) return env.LINE_CHANNEL_ACCESS_TOKEN
  if (cached && cached.expiresAt > now) return cached.token

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.LINE_CHANNEL_ID,
      client_secret: env.LINE_CHANNEL_SECRET,
    }),
  })

  if (!response.ok) {
    throw new Error(`アクセストークンの発行に失敗した: ${response.status} ${await response.text()}`)
  }

  const body = (await response.json()) as { access_token: string; expires_in: number }
  cached = {
    token: body.access_token,
    expiresAt: now + body.expires_in * 1000 - REFRESH_MARGIN_MS,
  }
  return body.access_token
}
