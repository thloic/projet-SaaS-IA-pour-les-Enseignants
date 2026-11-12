// Garde-fous d'intégration : pour chaque service externe (Gmail, Drive), une
// règle dit quels messages exigent cette connexion. Si le message correspond et
// que la connexion manque, l'agent répond directement par la carte de connexion,
// sans dépendre du choix d'un outil par le modèle.
//
// Ajouter un service = ajouter une entrée à INTEGRATION_GATES. Pas de branche
// spécifique dans la route de chat.
import {
  isFeatureSatisfied,
  type GoogleIntegrationFeature,
  type GoogleIntegrationStatus,
} from '../../integrations/google/schemas/googleIntegrationSchema.ts'
import { looksLikeGmailReadRequest } from './gmailReadIntent.ts'
import { looksLikeDriveFileRequest } from './driveFileIntent.ts'

export interface IntegrationGate {
  feature: GoogleIntegrationFeature
  matches(message: string): boolean
}

export const INTEGRATION_GATES: readonly IntegrationGate[] = [
  { feature: 'gmail', matches: looksLikeGmailReadRequest },
  { feature: 'drive', matches: looksLikeDriveFileRequest },
]

export interface IntegrationStatusReader {
  (): Promise<GoogleIntegrationStatus>
}

// Renvoie la première fonctionnalité manquante parmi TOUTES les règles qui
// correspondent au message, ou null si aucune ne manque. Lit le statut au plus
// une fois, et seulement si une règle correspond.
export async function findMissingConnection(
  message: string,
  readStatus: IntegrationStatusReader
): Promise<GoogleIntegrationFeature | null> {
  const matchingGates = INTEGRATION_GATES.filter((candidate) => candidate.matches(message))
  if (matchingGates.length === 0) return null

  const status = await readStatus()
  const missing = matchingGates.find((gate) => !isFeatureSatisfied(status, gate.feature))
  return missing ? missing.feature : null
}
