'use server'

import { getCurrentUser } from '@/features/profile/server/profile'
import { checkAndIncrementUsage, decrementUsage } from '@/features/billing/server/usage'
import {
  getGoogleIntegrationCredentials,
  updateGoogleAccessToken,
} from '@/features/integrations/google/server/googleIntegrationRepository'
import { refreshGoogleAccessToken } from '@/features/integrations/google/server/googleOAuthClient'
import { getValidGoogleAccessToken } from '@/features/integrations/google/server/googleAccessToken'
import { sendGmailMessage } from '@/features/integrations/google/server/sendGmailMessage'
import { GMAIL_SEND_SCOPE } from '@/features/integrations/google/schemas/googleIntegrationSchema'
import { markParentEmailDraftSent } from './parentEmailRepository'
import {
  orchestrateParentEmailSend,
  ParentEmailSendOrchestrationError,
} from './parentEmailSendOrchestration'

const USAGE_FEATURE = 'agent_email_send'

export interface ParentEmailSendResult {
  data: { messageId: string } | null
  error:
    | 'AUTH_REQUIRED'
    | 'GOOGLE_NOT_CONNECTED'
    | 'GOOGLE_SCOPE_MISSING'
    | 'QUOTA_EXCEEDED'
    | 'SEND_FAILED'
    | 'INVALID_INPUT'
    | null
}

// Action UI (bouton « Envoyer » sur la carte) — jamais une intention de chat,
// meme decision architecturale que la traduction et les boutons de statut du
// plan de suivi.
export async function sendParentEmailAction(input: {
  draftId: string
  to: string
  subject: string
  body: string
}): Promise<ParentEmailSendResult> {
  console.log('[action:parent-email-send] appel reçu', { draftId: input.draftId, to: input.to })
  const user = await getCurrentUser()
  if (!user) {
    console.log('[action:parent-email-send] aucun utilisateur authentifié')
    return { data: null, error: 'AUTH_REQUIRED' }
  }

  try {
    const result = await orchestrateParentEmailSend(
      { ...input, userId: user.id },
      {
        getAccessToken: (userId) =>
          getValidGoogleAccessToken(userId, GMAIL_SEND_SCOPE, {
            getCredentials: async (id) => {
              const credentials = await getGoogleIntegrationCredentials(id)
              console.log('[action:parent-email-send] identifiants Google trouvés ?', credentials !== null, credentials?.scopes)
              return credentials
                ? {
                    scopes: credentials.scopes,
                    accessToken: credentials.access_token,
                    refreshToken: credentials.refresh_token,
                    expiresAt: credentials.expires_at,
                  }
                : null
            },
            refreshAccessToken: refreshGoogleAccessToken,
            saveRefreshedToken: updateGoogleAccessToken,
          }),
        sendGmailMessage,
        markDraftSent: markParentEmailDraftSent,
        checkUsage: (userId) => checkAndIncrementUsage(userId, USAGE_FEATURE),
        refundUsage: (userId) => decrementUsage(userId, USAGE_FEATURE),
      }
    )
    console.log('[action:parent-email-send] succès', result)
    return { data: result, error: null }
  } catch (error) {
    console.error('[action:parent-email-send] erreur capturée', error)
    if (error instanceof ParentEmailSendOrchestrationError) {
      if (error.code === 'GOOGLE_NOT_CONNECTED') return { data: null, error: 'GOOGLE_NOT_CONNECTED' }
      if (error.code === 'GOOGLE_SCOPE_MISSING') return { data: null, error: 'GOOGLE_SCOPE_MISSING' }
      if (error.code === 'PARENT_EMAIL_SEND_QUOTA_EXCEEDED') return { data: null, error: 'QUOTA_EXCEEDED' }
      return { data: null, error: 'SEND_FAILED' }
    }
    console.error('[agent:parent-email-send] entrée invalide', error)
    return { data: null, error: 'INVALID_INPUT' }
  }
}
