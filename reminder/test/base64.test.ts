import { describe, expect, it } from 'vitest'
import { decodeBase64, encodeBase64, encodeBase64Bytes } from '../src/base64'

describe('encodeBase64', () => {
  it('日本語を含む文字列を往復しても壊れない', () => {
    const text = '0918\n- kaggleで磨くML\n- 面接対策\n'
    expect(decodeBase64(encodeBase64(text))).toBe(text)
  })
})

describe('decodeBase64', () => {
  it('GitHub API が挟む改行を無視する', () => {
    const encoded = encodeBase64('0918\n- No\n')
    const withNewlines = `${encoded.slice(0, 4)}\n${encoded.slice(4)}\n`
    expect(decodeBase64(withNewlines)).toBe('0918\n- No\n')
  })
})

describe('encodeBase64Bytes', () => {
  it('バイト列を base64 にする', () => {
    expect(encodeBase64Bytes(new Uint8Array([0, 1, 2, 253, 254, 255]))).toBe('AAEC/f7/')
  })
})
