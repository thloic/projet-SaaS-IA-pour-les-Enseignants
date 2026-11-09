// Contrat commun des outils de l'agent qui ont besoin d'une connexion externe.
// Un outil renvoie `{ status: 'needs_connection', feature }` au lieu d'une erreur ;
// la route de chat le transforme en carte de connexion, quel que soit l'outil.
import { GOOGLE_INTEGRATION_FEATURES, type GoogleIntegrationFeature } from '../../integrations/google/schemas/googleIntegrationSchema.ts'

export interface NeedsConnectionOutput {
  status: 'needs_connection'
  feature: GoogleIntegrationFeature
}

export function isNeedsConnectionOutput(value: unknown): value is NeedsConnectionOutput {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { status?: unknown; feature?: unknown }
  return (
    candidate.status === 'needs_connection' &&
    typeof candidate.feature === 'string' &&
    (GOOGLE_INTEGRATION_FEATURES as readonly string[]).includes(candidate.feature)
  )
}
