import { tool } from 'ai'
import { z } from 'zod'
import { listRecentParentEmailDraftsForUser } from './parentEmailDraftQueries.ts'
import { selectParentEmailDraftToSend } from './parentEmailDraftLookup.ts'
import type { ParentEmailRegister } from '../schemas/parentEmailSchema.ts'

// Outil de lecture : il retrouve le brouillon de courriel aux parents déjà
// généré et demande à l'interface d'afficher la carte de relecture. Il
// n'envoie jamais rien — l'envoi est uniquement le bouton « Envoyer » de la
// carte, après relecture de l'enseignant.

export const prepareParentEmailSendInputSchema = z.object({
  studentName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Prénom ou nom de l’élève concerné, si l’enseignant l’a mentionné.'),
})

export type PrepareParentEmailSendToolOutput =
  | {
      status: 'ready'
      draftId: string
      studentId: string
      register: ParentEmailRegister
      subject: string
      body: string
      familyLanguage: string
    }
  | { status: 'already_sent'; studentName: string; sentTo: string }
  | { status: 'not_found' }
  | { status: 'error' }

export function createPrepareParentEmailSendTool(userId: string) {
  return tool({
    description:
      'Prépare l’envoi d’un courriel aux parents déjà généré : affiche le brouillon à relire avec le bouton « Envoyer ». N’envoie jamais rien lui-même. Utilise-le quand l’enseignant demande d’envoyer le courriel aux parents.',
    inputSchema: prepareParentEmailSendInputSchema,
    execute: async ({ studentName }): Promise<PrepareParentEmailSendToolOutput> => {
      try {
        const rows = await listRecentParentEmailDraftsForUser(userId)
        const result = selectParentEmailDraftToSend(rows, studentName)

        if (result.status === 'not_found') return { status: 'not_found' }

        const { draft } = result
        const fullName = `${draft.studentFirstName} ${draft.studentLastName}`.trim()

        if (result.status === 'already_sent') {
          return { status: 'already_sent', studentName: fullName, sentTo: draft.sentTo ?? '' }
        }

        if (!draft.familyLanguage) return { status: 'error' }

        return {
          status: 'ready',
          draftId: draft.id,
          studentId: draft.studentId,
          register: draft.register,
          subject: draft.subject,
          body: draft.body,
          familyLanguage: draft.familyLanguage,
        }
      } catch (error) {
        console.error('[agent:prepare-parent-email-send] echec de la recherche du brouillon', error)
        return { status: 'error' }
      }
    },
  })
}
