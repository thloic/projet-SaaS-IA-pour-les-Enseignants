import 'server-only'

import { getValidGoogleAccessToken } from '../../google/server/googleAccessToken.ts'
import {
  getGoogleIntegrationCredentials,
  updateGoogleAccessToken,
} from '../../google/server/googleIntegrationRepository.ts'
import { refreshGoogleAccessToken } from '../../google/server/googleOAuthClient.ts'
import { DRIVE_SCOPE } from '../../google/schemas/googleIntegrationSchema.ts'

// Jeton d'accès Drive valide pour l'enseignant (scope Drive complet).
// Rafraîchi silencieusement si expiré (même mécanique que Gmail).
export function getDriveAccessToken(userId: string): Promise<string> {
  return getValidGoogleAccessToken(userId, DRIVE_SCOPE, {
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
  })
}
