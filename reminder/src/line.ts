import { encodeBase64Bytes } from './base64'
import type { Env } from './env'
import { accessToken } from './token'

const API_ORIGIN = 'https://api.line.me/v2/bot'

export type TextMessage = {
  text: string
  quickReplies?: string[]
}

/** 署名を検証する。LINE 以外からの POST で勝手にコミットされないようにするため。 */
export async function verifySignature(
  channelSecret: string,
  body: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return timingSafeEqual(encodeBase64Bytes(new Uint8Array(mac)), signature)
}

export async function pushMessage(env: Env, message: TextMessage): Promise<void> {
  await callApi(env, 'push', { to: env.LINE_USER_ID, messages: [toLineMessage(message)] })
}

export async function replyMessage(env: Env, replyToken: string, message: TextMessage): Promise<void> {
  await callApi(env, 'reply', { replyToken, messages: [toLineMessage(message)] })
}

async function callApi(env: Env, endpoint: string, payload: unknown): Promise<void> {
  const response = await fetch(`${API_ORIGIN}/message/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await accessToken(env)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`LINE への送信に失敗した: ${response.status} ${await response.text()}`)
  }
}

function toLineMessage(message: TextMessage): Record<string, unknown> {
  const base = { type: 'text', text: message.text }
  if (!message.quickReplies?.length) return base

  return {
    ...base,
    quickReply: {
      items: message.quickReplies.map((label) => ({
        type: 'action',
        action: { type: 'message', label, text: label },
      })),
    },
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
