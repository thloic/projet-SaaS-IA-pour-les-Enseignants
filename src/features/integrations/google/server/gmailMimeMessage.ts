// Encodage MIME minimal, suffisant pour un courriel texte brut — pas de
// pieces jointes ni de HTML dans cette V1 (hors perimetre, voir
// docs/PRD-agent-envoi-gmail-drive.md). Pur (aucun appel reseau ni secret),
// donc sans 'server-only' — testable directement.
export function buildRawMimeMessage(input: { to: string; subject: string; body: string }): string {
  const message = [
    `To: ${input.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(input.subject, 'utf-8').toString('base64')}?=`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    input.body,
  ].join('\r\n')

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
