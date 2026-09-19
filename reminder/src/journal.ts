/** 返信の本文を箇条書きの行に変換する。空行と、すでに付いている先頭の `- ` は落とす。 */
export function toBullets(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*・]\s*/, '').trim())
    .filter((line) => line.length > 0)
}

/** 月別ファイルに日付見出しがあるか。リマインドを送るかどうかの判定に使う。 */
export function hasHeader(content: string, header: string): boolean {
  return content.split(/\r?\n/).some((line) => line.trim() === header)
}

/**
 * 日付見出しの下に箇条書きを足した内容を返す。見出しがなければ末尾に新しく作る。
 * 見出しが最後とは限らないため、次の見出しの直前に差し込む。
 */
export function appendEntry(content: string, header: string, bullets: string[]): string {
  if (bullets.length === 0) return content

  const added = bullets.map((bullet) => `- ${bullet}`)
  const lines = content.length === 0 ? [] : content.replace(/\n+$/, '').split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => line.trim() === header)

  if (headerIndex === -1) {
    const section = [header, ...added]
    const body = lines.length === 0 ? section : [...lines, '', ...section]
    return `${body.join('\n')}\n`
  }

  const sectionEnd = findSectionEnd(lines, headerIndex)
  const merged = [...lines.slice(0, sectionEnd), ...added, ...lines.slice(sectionEnd)]
  return `${merged.join('\n')}\n`
}

/** 見出しの次の行から、箇条書きが途切れる位置（次の見出しの手前）を探す。 */
function findSectionEnd(lines: string[], headerIndex: number): number {
  let end = headerIndex + 1
  while (end < lines.length && lines[end].trim().startsWith('-')) {
    end += 1
  }
  return end
}
