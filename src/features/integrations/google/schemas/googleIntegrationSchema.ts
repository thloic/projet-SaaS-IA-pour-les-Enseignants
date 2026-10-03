import { z } from 'zod'

// Un seul scope sensible demande pour l'instant (envoi), jamais un scope
// restreint (gmail.readonly/modify) qui exigerait une evaluation de securite
// CASA cote Google — voir docs/PRD-agent-envoi-gmail-drive.md.
export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send'
// drive.file : non-sensible, acces limite aux fichiers choisis explicitement
// par l'enseignant via le selecteur Google (jamais tout son Drive).
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

export const GOOGLE_INTEGRATION_FEATURES = ['gmail', 'drive'] as const
export type GoogleIntegrationFeature = (typeof GOOGLE_INTEGRATION_FEATURES)[number]

export function scopeForFeature(feature: GoogleIntegrationFeature): string {
  return feature === 'gmail' ? GMAIL_SEND_SCOPE : DRIVE_FILE_SCOPE
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
