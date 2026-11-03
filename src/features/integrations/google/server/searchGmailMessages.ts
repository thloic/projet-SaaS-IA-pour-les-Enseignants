import { getGoogleIntegrationsMode } from './sendGmailMessage.ts'

export interface GmailSearchMessage {
  id: string
  from: string | null
  subject: string | null
  date: string | null
  snippet: string | null
}

export interface SearchGmailMessagesInput {
  accessToken: string
  query: string
  maxResults?: number
}

export async function searchGmailMessages(input: SearchGmailMessagesInput): Promise<GmailSearchMessage[]> {
  if (getGoogleIntegrationsMode() === 'mock') {
    return []
  }

  const { searchRealGmailMessages } = await import('./searchGmailMessagesReal.ts')
  return searchRealGmailMessages(input)
}
