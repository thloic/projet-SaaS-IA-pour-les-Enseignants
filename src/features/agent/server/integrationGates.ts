// Garde-fous d'intégration : pour chaque service externe (Gmail, Drive...), une
// règle dit quels messages exigent cette connexion. Si le message correspond et
// que la connexion manque, l'agent répond directement par la carte de connexion,
// sans dépendre du choix d'un outil par le modèle.
//
// Ajouter un service = ajouter une entrée à INTEGRATION_GATES. Pas de branche
// spécifique dans la route de chat.
import {
  GMAIL_READONLY_SCOPE,
  type GoogleIntegrationFeature,
} from '../../integrations/google/schemas/googleIntegrationSchema.ts'
import { looksLikeGmailReadRequest } from './gmailReadIntent.ts'

export interface IntegrationGate {
  feature: GoogleIntegrationFeature
  scope: string
  matches(message: string): boolean
}

export const INTEGRATION_GATES: readonly IntegrationGate[] = [
  { feature: 'gmail_read', scope: GMAIL_READONLY_SCOPE, matches: looksLikeGmailReadRequest },
]

export interface IntegrationStatusReader {
  (): Promise<{ connected: boolean; scopes: string[] }>
}

// Renvoie la fonctionnalité à connecter, ou null si le message n'en exige aucune
// ou si elle est déjà connectée. Lit le statut au plus une fois.
export async function findMissingConnection(
  message: string,
  readStatus: IntegrationStatusReader
): Promise<GoogleIntegrationFeature | null> {
  const gate = INTEGRATION_GATES.find((candidate) => candidate.matches(message))
  if (!gate) return null

  const status = await readStatus()
  const satisfied = status.connected && status.scopes.includes(gate.scope)
  return satisfied ? null : gate.feature
}
