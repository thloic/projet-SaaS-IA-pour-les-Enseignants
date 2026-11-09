// Registre des outils de l'agent. Pour ajouter un outil, l'ajouter ici : il est
// lié à l'enseignant connecté (userId figé à la création, jamais fourni par le
// modèle). Le contrat « besoin de connexion » est défini dans needsConnection.ts.
import { createGmailSearchTool } from './gmailSearchTool.ts'
import { createPrepareParentEmailSendTool } from './prepareParentEmailSendTool.ts'

export { isNeedsConnectionOutput, type NeedsConnectionOutput } from './needsConnection.ts'

export function createAgentTools(userId: string) {
  return {
    search_gmail_inbox: createGmailSearchTool(userId),
    prepare_parent_email_send: createPrepareParentEmailSendTool(userId),
  }
}
