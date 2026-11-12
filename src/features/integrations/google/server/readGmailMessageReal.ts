import 'server-only'

import { extractGmailMessageText } from './gmailMessageBody.ts'

export interface GmailFullMessage {
  id: string
  from: string | null
  to: string | null
  subject: string | null
  date: string | null
  text: string
  truncated: boolean
}

// Lit un message Gmail complet (en-têtes + corps) avec un client OAuth2 porteur
// du jeton. Lecture seule.
export async function readRealGmailMessage(input: { accessToken: string; messageId: string }): Promise<GmailFullMessage> {
  const { google } = await import('googleapis')
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: input.accessToken })
  const gmail = google.gmail({ version: 'v1', auth })

  const response = await gmail.users.messages.get({ userId: 'me', id: input.messageId, format: 'full' })
  const headers = response.data.payload?.headers ?? []
  const header = (name: string) => headers.find((entry) => entry.name === name)?.value ?? null
  const body = extractGmailMessageText(response.data.payload)

  return {
    id: input.messageId,
    from: header('From'),
    to: header('To'),
    subject: header('Subject'),
    date: header('Date'),
    text: body.text,
    truncated: body.truncated,
  }
}
