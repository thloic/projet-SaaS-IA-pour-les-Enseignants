import assert from 'node:assert/strict'
import test from 'node:test'
import { extractGmailMessageText, GMAIL_BODY_MAX_CHARS } from '../../src/features/integrations/google/server/gmailMessageBody.ts'

const encode = (text: string) => Buffer.from(text, 'utf8').toString('base64url')

test('texte brut privilégié quand il existe', () => {
  const result = extractGmailMessageText({
    mimeType: 'multipart/alternative',
    parts: [
      { mimeType: 'text/plain', body: { data: encode('Bonjour Léa') } },
      { mimeType: 'text/html', body: { data: encode('<p>Bonjour Léa HTML</p>') } },
    ],
  })
  assert.equal(result.text, 'Bonjour Léa')
  assert.equal(result.truncated, false)
})

test('repli sur le HTML converti en texte quand il n’y a pas de texte brut', () => {
  const result = extractGmailMessageText({
    mimeType: 'text/html',
    body: { data: encode('<div>Rendez-vous &amp; suivi</div><p>Merci</p><style>p{}</style>') },
  })
  assert.match(result.text, /Rendez-vous & suivi/)
  assert.match(result.text, /Merci/)
  assert.doesNotMatch(result.text, /p\{\}/)
})

test('parties imbriquées parcourues récursivement', () => {
  const result = extractGmailMessageText({
    mimeType: 'multipart/mixed',
    parts: [
      {
        mimeType: 'multipart/alternative',
        parts: [{ mimeType: 'text/plain', body: { data: encode('Texte imbriqué') } }],
      },
      { mimeType: 'application/pdf', body: { data: null } },
    ],
  })
  assert.equal(result.text, 'Texte imbriqué')
})

test('payload absent : texte vide', () => {
  assert.deepEqual(extractGmailMessageText(null), { text: '', truncated: false })
})

test('texte trop long : tronqué à la limite avec indicateur', () => {
  const long = 'a'.repeat(GMAIL_BODY_MAX_CHARS + 500)
  const result = extractGmailMessageText({ mimeType: 'text/plain', body: { data: encode(long) } })
  assert.equal(result.text.length, GMAIL_BODY_MAX_CHARS)
  assert.equal(result.truncated, true)
})
