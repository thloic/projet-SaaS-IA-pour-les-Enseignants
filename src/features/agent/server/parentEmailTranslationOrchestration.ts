import { parentEmailTranslationInputSchema, type ParentEmailDraft } from '../schemas/parentEmailSchema.ts'

export type ParentEmailTranslationOrchestrationErrorCode =
  | 'PARENT_EMAIL_TRANSLATION_QUOTA_EXCEEDED'
  | 'PARENT_EMAIL_TRANSLATION_FAILED'

export class ParentEmailTranslationOrchestrationError extends Error {
  readonly code: ParentEmailTranslationOrchestrationErrorCode

  constructor(code: ParentEmailTranslationOrchestrationErrorCode) {
    super(code)
    this.name = 'ParentEmailTranslationOrchestrationError'
    this.code = code
  }
}

export interface ParentEmailTranslationOrchestrationDependencies {
  translateParentEmailDraft(input: {
    subject: string
    body: string
    targetLanguage: string
  }): Promise<ParentEmailDraft>
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
}

// Action de bouton sur la carte, jamais une intention de chat (meme decision
// que followUpPlanTracking.actions.ts) : l'entree est toujours le texte
// affiche a l'ecran au moment du clic, retouches de l'enseignant comprises.
export async function orchestrateParentEmailTranslation(
  input: {
    subject: string
    body: string
    targetLanguage: string
    trustedUserId: string
  },
  dependencies: ParentEmailTranslationOrchestrationDependencies
): Promise<ParentEmailDraft> {
  const parsed = parentEmailTranslationInputSchema.parse({
    subject: input.subject,
    body: input.body,
    targetLanguage: input.targetLanguage,
  })

  const usage = await dependencies.checkUsage(input.trustedUserId)
  if (!usage.allowed) {
    throw new ParentEmailTranslationOrchestrationError('PARENT_EMAIL_TRANSLATION_QUOTA_EXCEEDED')
  }

  try {
    return await dependencies.translateParentEmailDraft(parsed)
  } catch (error) {
    console.error('[agent:parent-email-translation] echec de la traduction', error)
    try {
      await dependencies.refundUsage(input.trustedUserId)
    } catch {
      // Le remboursement ne doit pas masquer l'erreur de traduction initiale.
    }
    throw new ParentEmailTranslationOrchestrationError('PARENT_EMAIL_TRANSLATION_FAILED')
  }
}
