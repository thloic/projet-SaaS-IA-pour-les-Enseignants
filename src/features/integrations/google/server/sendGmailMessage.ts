export interface SendGmailMessageInput {
  accessToken: string
  to: string
  subject: string
  body: string
}

export type GoogleIntegrationsMode = 'mock' | 'real'

export function getGoogleIntegrationsMode(): GoogleIntegrationsMode {
  const mode = process.env.GOOGLE_INTEGRATIONS_MODE ?? 'real'
  if (mode === 'mock' || mode === 'real') return mode
  throw new Error('INVALID_GOOGLE_INTEGRATIONS_MODE')
}

export async function sendGmailMessage(input: SendGmailMessageInput): Promise<{ messageId: string }> {
  if (getGoogleIntegrationsMode() === 'mock') {
    return { messageId: `mock-${Date.now()}` }
  }

  const { sendRealGmailMessage } = await import('./sendGmailMessageReal.ts')
  return sendRealGmailMessage(input)
}
