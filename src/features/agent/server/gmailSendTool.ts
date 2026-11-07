import { tool } from 'ai'
import { gmailSendToolInputSchema, type GmailSendToolOutput } from '../schemas/gmailSendToolSchema.ts'
import { getValidGoogleAccessToken } from '../../integrations/google/server/googleAccessToken.ts'
import {
  getGoogleIntegrationCredentials,
  updateGoogleAccessToken,
} from '../../integrations/google/server/googleIntegrationRepository.ts'
import { refreshGoogleAccessToken } from '../../integrations/google/server/googleOAuthClient.ts'
import { GMAIL_SEND_SCOPE } from '../../integrations/google/schemas/googleIntegrationSchema.ts'
import { sendGmailMessage } from '../../integrations/google/server/sendGmailMessage.ts'
import { checkAndIncrementUsage, decrementUsage } from '../../billing/server/usage.ts'
import { orchestrateParentEmailSend, ParentEmailSendOrchestrationError } from './parentEmailSendOrchestration.ts'
import { markParentEmailDraftSent } from './parentEmailRepository.ts'

// Outil d'envoi Gmail strictement lié à un enseignant (userId figé).
// Jamais une erreur brute sur "pas connecté" — retourne needs_connection
// pour que route.ts transforme ça en carte de connexion.
// L'envoi est toujours précédé d'une relecture explicite par l'enseignant
// dans la conversation (voir PRD-agent-envoi-gmail-drive.md).
export function createGmailSendTool(userId: string) {
  return tool({
    description:
      "Envoie un courriel depuis la boîte Gmail personnelle de l'enseignant (jamais une adresse générique). Demande toujours confirmation explicite avant d'utiliser cet outil. Si l'enseignant n'a pas encore connecté son accès Gmail, retourne needs_connection plutôt qu'une erreur.",
    inputSchema: gmailSendToolInputSchema,
    execute: async ({ to, subject, body, draftId }): Promise<GmailSendToolOutput> => {
      try {
        const accessToken = await getValidGoogleAccessToken(userId, GMAIL_SEND_SCOPE, {
          getCredentials: async (id) => {
            const credentials = await getGoogleIntegrationCredentials(id)
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
        })

        // Vérifier le quota avant envoi
        const { allowed: quotaAllowed } = await checkAndIncrementUsage(userId, 'agent_email_send')
        if (!quotaAllowed) {
          return {
            status: 'error',
            reason: 'Quota d\'envois dépassé pour ce mois',
          }
        }

        // Utiliser l'orchestration existante pour envoyer
        const result = await orchestrateParentEmailSend(
          {
            draftId,
            userId,
            to,
            subject,
            body,
          },
          {
            getAccessToken: async (uid: string) => accessToken,
            sendGmailMessage,
            markDraftSent: (input) => markParentEmailDraftSent({
              draftId: input.draftId,
              userId,
              sentTo: input.sentTo,
            }),
            checkUsage: async () => ({ allowed: true }), // Déjà vérifiée ci-dessus
            refundUsage: (uid) => decrementUsage(uid, 'agent_email_send'),
          }
        )

        return {
          status: 'ok',
          messageId: result.messageId,
        }
      } catch (error) {
        // Gestion des erreurs de connexion Google
        if (error instanceof ParentEmailSendOrchestrationError) {
          if (error.code === 'GOOGLE_NOT_CONNECTED' || error.code === 'GOOGLE_SCOPE_MISSING') {
            return {
              status: 'needs_connection',
              feature: 'gmail',
            }
          }
          if (error.code === 'PARENT_EMAIL_SEND_QUOTA_EXCEEDED') {
            return {
              status: 'error',
              reason: 'Quota d\'envois dépassé pour ce mois',
            }
          }
          return {
            status: 'error',
            reason: 'Erreur lors de l\'envoi du courriel',
          }
        }

        console.error('[agent:gmail-send-tool] erreur', error)
        return {
          status: 'error',
          reason: 'Erreur interne lors de l\'envoi',
        }
      }
    },
  })
}
