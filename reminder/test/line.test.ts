import { describe, expect, it } from 'vitest'
import { verifySignature } from '../src/line'

const CHANNEL_SECRET = 'channel-secret'
const BODY = JSON.stringify({ events: [] })
// openssl dgst -sha256 -hmac channel-secret で求めた値
const SIGNATURE = 'nENZU9xVqQeZgEX6Nd5huQOCgqTEa5S67sXEhrGuTDk='

describe('verifySignature', () => {
  it('LINE が付ける署名を受け入れる', async () => {
    expect(await verifySignature(CHANNEL_SECRET, BODY, SIGNATURE)).toBe(true)
  })

  it('本文が改ざんされていれば弾く', async () => {
    const tampered = JSON.stringify({ events: [{ type: 'message' }] })
    expect(await verifySignature(CHANNEL_SECRET, tampered, SIGNATURE)).toBe(false)
  })

  it('別のチャネルシークレットで作った署名は弾く', async () => {
    expect(await verifySignature('another-secret', BODY, SIGNATURE)).toBe(false)
  })

  it('署名がなければ弾く', async () => {
    expect(await verifySignature(CHANNEL_SECRET, BODY, null)).toBe(false)
  })
})
