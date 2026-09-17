import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../src/env'

const ENV = {
  LINE_CHANNEL_ID: '2000000000',
  LINE_CHANNEL_SECRET: 'channel-secret',
} as Env

/** キャッシュはモジュールが持つので、テストごとに読み込み直す。 */
async function loadAccessToken() {
  vi.resetModules()
  const module = await import('../src/token')
  return module.accessToken
}

function stubTokenEndpoint(token: string, expiresIn = 900) {
  const fetchMock = vi.fn(async () => Response.json({ access_token: token, expires_in: expiresIn }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('accessToken', () => {
  it('長期トークンが登録されていればそれを使う', async () => {
    const fetchMock = stubTokenEndpoint('stateless-token')
    const accessToken = await loadAccessToken()

    const token = await accessToken({ ...ENV, LINE_CHANNEL_ACCESS_TOKEN: 'long-lived-token' }, 0)

    expect(token).toBe('long-lived-token')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('登録がなければチャネルIDとシークレットで発行する', async () => {
    const fetchMock = stubTokenEndpoint('stateless-token')
    const accessToken = await loadAccessToken()

    expect(await accessToken(ENV, 0)).toBe('stateless-token')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.line.me/oauth2/v3/token')
    expect(String(init.body)).toBe(
      'grant_type=client_credentials&client_id=2000000000&client_secret=channel-secret',
    )
  })

  it('期限内は発行済みのトークンを使い回す', async () => {
    const fetchMock = stubTokenEndpoint('stateless-token')
    const accessToken = await loadAccessToken()

    await accessToken(ENV, 0)
    await accessToken(ENV, 600_000)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('期限が近づいたら取り直す', async () => {
    const fetchMock = stubTokenEndpoint('stateless-token')
    const accessToken = await loadAccessToken()

    await accessToken(ENV, 0)
    await accessToken(ENV, 900_000 - 60_000)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('発行に失敗したら例外を投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('invalid_client', { status: 400 })),
    )
    const accessToken = await loadAccessToken()

    await expect(accessToken(ENV, 0)).rejects.toThrow('アクセストークンの発行に失敗した: 400')
  })
})
