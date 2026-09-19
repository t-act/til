import { dateHeader, entryDate, isoDate, journalPath, type EntryDate } from './day'
import type { Env } from './env'
import * as github from './github'
import { appendEntry, hasHeader, toBullets } from './journal'
import * as line from './line'

// cron は wrangler.jsonc の triggers.crons と対応する。実行時刻ではなく予定時刻で
// 文面を選ぶのは、起動が遅れた日でも段階が入れ替わらないようにするため
const REMINDERS: Record<string, string> = {
  '0 11 * * *': '今日の記録がまだありません。書いたら、この返信で送ってください。',
  '0 12 * * *': '今日の記録がまだありません。何をしたか、一言返してください。',
  '0 13 * * *': '今日の記録がまだありません。日付が変わる前に返しましょう。',
}
const DEFAULT_REMINDER = '今日の記録がまだありません。'

const CONFLICT_RETRY_LIMIT = 2

export default {
  async scheduled(event, env: Env, ctx): Promise<void> {
    ctx.waitUntil(remind(env, event.cron))
  },

  async fetch(request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

    const body = await request.text()
    const signature = request.headers.get('x-line-signature')
    if (!(await line.verifySignature(env.LINE_CHANNEL_SECRET, body, signature))) {
      return new Response('Unauthorized', { status: 401 })
    }

    const events = (JSON.parse(body) as { events?: WebhookEvent[] }).events ?? []
    for (const event of events) {
      if (!isOwnTextMessage(event, env.LINE_USER_ID)) continue
      await handleText(env, event.message.text, event.replyToken)
    }

    // LINE は 200 以外を受け取ると再送するため、記録に失敗しても 200 を返す
    return new Response('OK')
  },
} satisfies ExportedHandler<Env>

type WebhookEvent = {
  type: string
  replyToken?: string
  source?: { userId?: string }
  message?: { type: string; text?: string }
}

type OwnTextMessage = WebhookEvent & {
  replyToken: string
  message: { type: 'text'; text: string }
}

function isOwnTextMessage(event: WebhookEvent, userId: string): event is OwnTextMessage {
  return (
    event.type === 'message' &&
    event.message?.type === 'text' &&
    typeof event.message.text === 'string' &&
    typeof event.replyToken === 'string' &&
    event.source?.userId === userId
  )
}

async function remind(env: Env, cron: string): Promise<void> {
  const date = entryDate(new Date(), env.ENTRY_CUTOFF_HOUR)
  const file = await github.getFile(env, journalPath(date, env.JOURNAL_DIR))
  if (file && hasHeader(file.content, dateHeader(date))) return

  await line.pushMessage(env, {
    text: REMINDERS[cron] ?? DEFAULT_REMINDER,
    quickReplies: ['No'],
  })
}

async function handleText(env: Env, text: string, replyToken: string): Promise<void> {
  const bullets = toBullets(text)
  if (bullets.length === 0) {
    await line.replyMessage(env, replyToken, { text: '記録する内容がありませんでした。' })
    return
  }

  const date = entryDate(new Date(), env.ENTRY_CUTOFF_HOUR)
  try {
    await commitEntry(env, date, bullets)
    await line.replyMessage(env, replyToken, {
      text: `${isoDate(date)} に記録しました。\n${bullets.map((bullet) => `- ${bullet}`).join('\n')}`,
    })
  } catch (error) {
    // 失敗を黙って捨てるとトークンの期限切れに気づけないため、本人に伝える
    await line.replyMessage(env, replyToken, {
      text: `記録に失敗しました。\n${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

async function commitEntry(
  env: Env,
  date: EntryDate,
  bullets: string[],
  attempt = 0,
): Promise<void> {
  const path = journalPath(date, env.JOURNAL_DIR)
  const file = await github.getFile(env, path)
  const content = appendEntry(file?.content ?? '', dateHeader(date), bullets)

  try {
    await github.putFile(env, path, content, `update: ${isoDate(date)}`, file?.sha)
  } catch (error) {
    if (error instanceof github.ConflictError && attempt < CONFLICT_RETRY_LIMIT) {
      await commitEntry(env, date, bullets, attempt + 1)
      return
    }
    throw error
  }
}
