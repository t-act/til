import { describe, expect, it } from 'vitest'
import { dateHeader, entryDate, isoDate, journalPath } from '../src/day'

const CUTOFF = 6

describe('entryDate', () => {
  it('リマインドが鳴る 20:00 JST は当日になる', () => {
    expect(entryDate(new Date('2026-09-18T11:00:00Z'), CUTOFF)).toEqual({ year: 2026, month: 9, day: 18 })
  })

  it('日付が変わった直後の 00:38 JST は前日になる', () => {
    expect(entryDate(new Date('2026-09-18T15:38:00Z'), CUTOFF)).toEqual({ year: 2026, month: 9, day: 18 })
  })

  it('締め切り直前の 05:59 JST は前日になる', () => {
    expect(entryDate(new Date('2026-09-18T20:59:00Z'), CUTOFF)).toEqual({ year: 2026, month: 9, day: 18 })
  })

  it('締め切りちょうどの 06:00 JST は当日になる', () => {
    expect(entryDate(new Date('2026-09-18T21:00:00Z'), CUTOFF)).toEqual({ year: 2026, month: 9, day: 19 })
  })

  it('月をまたぐ深夜は前月の末日になる', () => {
    expect(entryDate(new Date('2026-09-30T16:30:00Z'), CUTOFF)).toEqual({ year: 2026, month: 9, day: 30 })
  })

  it('年をまたぐ深夜は前年の末日になる', () => {
    expect(entryDate(new Date('2026-12-31T18:00:00Z'), CUTOFF)).toEqual({ year: 2026, month: 12, day: 31 })
  })
})

describe('dateHeader', () => {
  it('月と日を2桁に揃える', () => {
    expect(dateHeader({ year: 2026, month: 9, day: 3 })).toBe('0903')
  })
})

describe('isoDate', () => {
  it('コミットメッセージ用に YYYY-MM-DD で返す', () => {
    expect(isoDate({ year: 2026, month: 9, day: 3 })).toBe('2026-09-03')
  })
})

describe('journalPath', () => {
  it('年のディレクトリの下の月別ファイルを指す', () => {
    expect(journalPath({ year: 2026, month: 9, day: 18 }, 'logs')).toBe('logs/2026/2026-09.md')
  })
})
