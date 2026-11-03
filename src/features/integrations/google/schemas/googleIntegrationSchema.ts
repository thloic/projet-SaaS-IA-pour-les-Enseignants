import { z } from 'zod'

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send'
// gmail.readonly : scope sensible cote Google (necessitera une evaluation de
// securite CASA avant une ouverture a tous les enseignants) — accorde a part
// de l'envoi, uniquement pour que l'agent puisse chercher/lire dans la boite
// de l'enseignant qui l'a explicitement connecte. Voir docs/PRD-agent-envoi-gmail-drive.md.
export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
// drive.file : non-sensible, acces limite aux fichiers choisis explicitement
// par l'enseignant via le selecteur Google (jamais tout son Drive).
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

export const GOOGLE_INTEGRATION_FEATURES = ['gmail', 'drive', 'gmail_read'] as const
export type GoogleIntegrationFeature = (typeof GOOGLE_INTEGRATION_FEATURES)[number]

const SCOPE_BY_FEATURE: Record<GoogleIntegrationFeature, string> = {
  gmail: GMAIL_SEND_SCOPE,
  drive: DRIVE_FILE_SCOPE,
  gmail_read: GMAIL_READONLY_SCOPE,
}

export function scopeForFeature(feature: GoogleIntegrationFeature): string {
  return SCOPE_BY_FEATURE[feature]
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

export function hasScope(status: GoogleIntegrationStatus, scope: string): boolean {
  return status.connected && status.scopes.includes(scope)
}
