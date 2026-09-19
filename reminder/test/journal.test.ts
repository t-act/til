import { describe, expect, it } from 'vitest'
import { appendEntry, hasHeader, toBullets } from '../src/journal'

describe('toBullets', () => {
  it('行ごとに分ける', () => {
    expect(toBullets('kaggle\n面接対策')).toEqual(['kaggle', '面接対策'])
  })

  it('空行と前後の空白を落とす', () => {
    expect(toBullets('  kaggle  \n\n\n面接対策\n')).toEqual(['kaggle', '面接対策'])
  })

  it('すでに箇条書きの記号が付いていれば落とす', () => {
    expect(toBullets('- kaggle\n・面接対策')).toEqual(['kaggle', '面接対策'])
  })

  it('本文が空なら何も返さない', () => {
    expect(toBullets('   \n  ')).toEqual([])
  })
})

describe('hasHeader', () => {
  it('その日の見出しがあれば true を返す', () => {
    expect(hasHeader('0917\n- No\n\n0918\n- kaggle\n', '0918')).toBe(true)
  })

  it('見出しがなければ false を返す', () => {
    expect(hasHeader('0917\n- No\n', '0918')).toBe(false)
  })

  it('箇条書きの中に同じ文字列があっても見出しとは見なさない', () => {
    expect(hasHeader('0917\n- 0918 の準備\n', '0918')).toBe(false)
  })
})

describe('appendEntry', () => {
  it('月初はファイルの先頭から書き始める', () => {
    expect(appendEntry('', '1001', ['kaggle'])).toBe('1001\n- kaggle\n')
  })

  it('その日が初めての記録なら空行を挟んで見出しを作る', () => {
    expect(appendEntry('0917\n- No\n', '0918', ['kaggle'])).toBe('0917\n- No\n\n0918\n- kaggle\n')
  })

  it('すでに見出しがあればその下に足す', () => {
    expect(appendEntry('0917\n- No\n\n0918\n- kaggle\n', '0918', ['面接対策'])).toBe(
      '0917\n- No\n\n0918\n- kaggle\n- 面接対策\n',
    )
  })

  it('見出しが途中にあっても次の見出しの手前に足す', () => {
    expect(appendEntry('0917\n- kaggle\n\n0918\n- No\n', '0917', ['面接対策'])).toBe(
      '0917\n- kaggle\n- 面接対策\n\n0918\n- No\n',
    )
  })

  it('末尾の余分な改行を残さない', () => {
    expect(appendEntry('0917\n- No\n\n\n', '0918', ['kaggle'])).toBe('0917\n- No\n\n0918\n- kaggle\n')
  })

  it('足す内容がなければ元のまま返す', () => {
    expect(appendEntry('0917\n- No\n', '0918', [])).toBe('0917\n- No\n')
  })
})
