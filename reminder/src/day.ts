const HOUR_MS = 60 * 60 * 1000
const JST_OFFSET_MS = 9 * HOUR_MS

export type EntryDate = {
  year: number
  month: number
  day: number
}

/**
 * 記録先の日付を返す。cutoffHour より前の時刻は前日として扱う。
 * 深夜に返信した分を前日の記録として残すため。
 */
export function entryDate(now: Date, cutoffHour: number): EntryDate {
  const shifted = new Date(now.getTime() + JST_OFFSET_MS - cutoffHour * HOUR_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

/** 月別ファイル内の日付見出し（例: 0913）。 */
export function dateHeader(date: EntryDate): string {
  return `${pad(date.month)}${pad(date.day)}`
}

/** コミットメッセージに使う日付（例: 2026-09-13）。 */
export function isoDate(date: EntryDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`
}

/** 月別ファイルのパス（例: logs/2026/2026-09.md）。 */
export function journalPath(date: EntryDate, journalDir: string): string {
  return `${journalDir}/${date.year}/${date.year}-${pad(date.month)}.md`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
