export function encodeBase64(text: string): string {
  return encodeBase64Bytes(new TextEncoder().encode(text))
}

export function encodeBase64Bytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function decodeBase64(base64: string): string {
  // GitHub API は 60 文字ごとに改行を挟んで返す
  const binary = atob(base64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
