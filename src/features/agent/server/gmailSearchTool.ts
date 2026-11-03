import { tool } from 'ai'
import { gmailSearchToolInputSchema, type GmailSearchToolOutput } from '../schemas/gmailSearchSchema.ts'
import { orchestrateGmailSearch, GmailSearchOrchestrationError } from './gmailSearchOrchestration.ts'
import { getValidGoogleAccessToken } from '../../integrations/google/server/googleAccessToken.ts'
import {
  getGoogleIntegrationCredentials,
  updateGoogleAccessToken,
} from '../../integrations/google/server/googleIntegrationRepository.ts'
import { refreshGoogleAccessToken } from '../../integrations/google/server/googleOAuthClient.ts'
import { GMAIL_READONLY_SCOPE } from '../../integrations/google/schemas/googleIntegrationSchema.ts'
import { searchGmailMessages } from '../../integrations/google/server/searchGmailMessages.ts'

// Outil strictement en lecture, lie a un seul enseignant (userId figé a la
// creation, jamais passe par le modele). Ne lance jamais d'erreur sur "pas
// connecte" — retourne un statut que route.ts transforme en carte de
// connexion dans le fil, jamais en echec du tour de chat.
export function createGmailSearchTool(userId: string) {
  return tool({
    description:
      "Recherche dans la boîte Gmail de l'enseignant connecté (expéditeur, objet, extrait). Strictement en lecture, jamais d'envoi. Si l'enseignant n'a pas encore connecté cet accès, retourne needs_connection plutôt qu'une erreur.",
    inputSchema: gmailSearchToolInputSchema,
    execute: async ({ query }): Promise<GmailSearchToolOutput> => {
      try {
        const results = await orchestrateGmailSearch(
          { userId, query },
          {
            getAccessToken: (id) =>
              getValidGoogleAccessToken(id, GMAIL_READONLY_SCOPE, {
                getCredentials: async (uid) => {
                  const credentials = await getGoogleIntegrationCredentials(uid)
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
            searchGmail: searchGmailMessages,
          }
        )
        return { status: 'ok', results }
      } catch (error) {
        if (
          error instanceof GmailSearchOrchestrationError &&
          (error.code === 'GOOGLE_NOT_CONNECTED' || error.code === 'GOOGLE_SCOPE_MISSING')
        ) {
          return { status: 'needs_connection', feature: 'gmail_read' }
        }
        console.error('[agent:gmail-search-tool] echec', error)
        return { status: 'error' }
      }
    },
  })
}
