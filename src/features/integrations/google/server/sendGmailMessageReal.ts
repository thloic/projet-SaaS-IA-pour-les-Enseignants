import 'server-only'

import { buildRawMimeMessage } from './gmailMimeMessage.ts'

export interface SendRealGmailMessageInput {
  accessToken: string
  to: string
  subject: string
  body: string
}

export async function sendRealGmailMessage(input: SendRealGmailMessageInput): Promise<{ messageId: string }> {
  console.log('[gmail:send-real] appel API Gmail', { to: input.to, subjectLength: input.subject.length })
  const { google } = await import('googleapis')
  // Une string passee en `auth` est interpretee par googleapis comme une cle
  // API (ajoutee en ?key=...), jamais comme un jeton OAuth2 Bearer — il faut
  // un client OAuth2 porteur du jeton pour que l'appel soit authentifie
  // comme un utilisateur (voir docs/PRD-agent-envoi-gmail-drive.md).
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: input.accessToken })
  const gmail = google.gmail({ version: 'v1', auth })

  try {
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: buildRawMimeMessage(input) },
    })
    console.log('[gmail:send-real] réponse API Gmail', { id: response.data.id, status: response.status })

    if (!response.data.id) throw new Error('GMAIL_SEND_MISSING_MESSAGE_ID')
    return { messageId: response.data.id }
  } catch (error) {
    console.error('[gmail:send-real] échec de l’appel API Gmail', error)
    throw error
  }
}
