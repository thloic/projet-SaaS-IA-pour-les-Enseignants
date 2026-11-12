// Extraction pure du texte d'un message Gmail (format « full »). Aucun appel
// réseau : testable unitairement.

export interface GmailMessagePart {
  mimeType?: string | null
  body?: { data?: string | null; size?: number | null } | null
  parts?: GmailMessagePart[] | null
}

export const GMAIL_BODY_MAX_CHARS = 20_000

function decodeBase64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8')
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/giu, ' ')
    .replace(/<script[\s\S]*?<\/script>/giu, ' ')
    .replace(/<br\s*\/?>/giu, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/giu, '\n')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/[ \t]+/gu, ' ')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

// Parcourt récursivement les parties ; préfère le texte brut, à défaut le HTML
// converti en texte.
function collect(part: GmailMessagePart, mime: 'text/plain' | 'text/html'): string[] {
  const own = part.mimeType === mime && part.body?.data ? [decodeBase64Url(part.body.data)] : []
  const nested = (part.parts ?? []).flatMap((child) => collect(child, mime))
  return [...own, ...nested]
}

export function extractGmailMessageText(payload: GmailMessagePart | null | undefined): { text: string; truncated: boolean } {
  if (!payload) return { text: '', truncated: false }

  const plain = collect(payload, 'text/plain').join('\n').trim()
  const text = plain || stripHtml(collect(payload, 'text/html').join('\n'))
  const normalized = text.replace(/\r\n?/gu, '\n').trim()

  if (normalized.length <= GMAIL_BODY_MAX_CHARS) return { text: normalized, truncated: false }
  return { text: normalized.slice(0, GMAIL_BODY_MAX_CHARS).trimEnd(), truncated: true }
}
