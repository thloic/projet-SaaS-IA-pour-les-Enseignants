import 'server-only'

import type { GmailSearchMessage, SearchGmailMessagesInput } from './searchGmailMessages.ts'

export async function searchRealGmailMessages(input: SearchGmailMessagesInput): Promise<GmailSearchMessage[]> {
  console.log('[gmail:search-real] appel API Gmail', { queryLength: input.query.length })
  const { google } = await import('googleapis')
  // Meme precaution que l'envoi : un client OAuth2 porteur du jeton, jamais
  // une string nue (interpretee comme une cle API par googleapis).
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: input.accessToken })
  const gmail = google.gmail({ version: 'v1', auth })

  try {
    const list = await gmail.users.messages.list({
      userId: 'me',
      q: input.query,
      maxResults: input.maxResults ?? 5,
    })

    const ids = (list.data.messages ?? []).map((item) => item.id).filter((id): id is string => Boolean(id))

    const messages = await Promise.all(
      ids.map(async (id) => {
        const message = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        })
        const headers = message.data.payload?.headers ?? []
        const header = (name: string) => headers.find((entry) => entry.name === name)?.value ?? null
        return {
          id,
          from: header('From'),
          subject: header('Subject'),
          date: header('Date'),
          snippet: message.data.snippet ?? null,
        } satisfies GmailSearchMessage
      })
    )

    return messages
  } catch (error) {
    console.error('[gmail:search-real] échec de l’appel API Gmail', error)
    throw error
  }
}
