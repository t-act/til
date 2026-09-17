import { decodeBase64, encodeBase64 } from './base64'
import type { Env } from './env'

const API_ORIGIN = 'https://api.github.com'

export type JournalFile = {
  content: string
  sha: string
}

/** 取得した sha が古く、書き込みが弾かれたとき。PC から同時にコミットした場合に起きる。 */
export class ConflictError extends Error {}

export async function getFile(env: Env, path: string): Promise<JournalFile | null> {
  const url = `${API_ORIGIN}/repos/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH}`
  const response = await fetch(url, { headers: apiHeaders(env) })

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`ファイルの取得に失敗した: ${response.status} ${await response.text()}`)
  }

  const body = (await response.json()) as { content: string; sha: string }
  return { content: decodeBase64(body.content), sha: body.sha }
}

export async function putFile(
  env: Env,
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<void> {
  const url = `${API_ORIGIN}/repos/${env.GITHUB_REPO}/contents/${path}`
  const response = await fetch(url, {
    method: 'PUT',
    headers: { ...apiHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: encodeBase64(content),
      branch: env.GITHUB_BRANCH,
      sha,
    }),
  })

  if (response.status === 409 || response.status === 422) {
    throw new ConflictError(`書き込みが競合した: ${response.status}`)
  }
  if (!response.ok) {
    throw new Error(`ファイルの書き込みに失敗した: ${response.status} ${await response.text()}`)
  }
}

function apiHeaders(env: Env): Record<string, string> {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    // GitHub API は User-Agent がないと 403 を返す
    'User-Agent': 'til-reminder',
  }
}
