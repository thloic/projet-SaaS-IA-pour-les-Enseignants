import { z } from 'zod'

// Scopes Google utilisés par EducAssist. Ils sont regroupés par fonctionnalité
// visible par l'enseignant : « Gmail » (lecture + envoi) et « Google Drive »
// (accès complet aux fichiers). Voir docs/PRD-agent-envoi-gmail-drive.md.
export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send'
export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
// Accès complet au Drive (lecture, création, modification). Scope restreint côté
// Google : vérification requise avant ouverture publique.
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'

export const GOOGLE_INTEGRATION_FEATURES = ['gmail', 'drive'] as const
export type GoogleIntegrationFeature = (typeof GOOGLE_INTEGRATION_FEATURES)[number]

const SCOPES_BY_FEATURE: Record<GoogleIntegrationFeature, readonly string[]> = {
  gmail: [GMAIL_READONLY_SCOPE, GMAIL_SEND_SCOPE],
  drive: [DRIVE_SCOPE],
}

export function scopesForFeature(feature: GoogleIntegrationFeature): readonly string[] {
  return SCOPES_BY_FEATURE[feature]
}

export const googleIntegrationRecordSchema = z.object({
  userId: z.string().uuid(),
  scopes: z.array(z.string().min(1)),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.string().datetime({ offset: true }),
})

export type GoogleIntegrationRecord = z.infer<typeof googleIntegrationRecordSchema>

export interface GoogleIntegrationStatus {
  connected: boolean
  scopes: string[]
}

// Une fonctionnalité est active seulement si TOUS ses scopes sont accordés.
export function isFeatureSatisfied(status: GoogleIntegrationStatus, feature: GoogleIntegrationFeature): boolean {
  return status.connected && scopesForFeature(feature).every((scope) => status.scopes.includes(scope))
}

export function hasScope(status: GoogleIntegrationStatus, scope: string): boolean {
  return status.connected && status.scopes.includes(scope)
}
