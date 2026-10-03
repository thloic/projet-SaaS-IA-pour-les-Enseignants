import { parentEmailSendInputSchema } from '../schemas/parentEmailSendSchema.ts'
import { GoogleAccessTokenError } from '../../integrations/google/server/googleAccessToken.ts'

export type ParentEmailSendErrorCode =
  | 'GOOGLE_NOT_CONNECTED'
  | 'GOOGLE_SCOPE_MISSING'
  | 'PARENT_EMAIL_SEND_QUOTA_EXCEEDED'
  | 'PARENT_EMAIL_SEND_FAILED'

export class ParentEmailSendOrchestrationError extends Error {
  readonly code: ParentEmailSendErrorCode

  constructor(code: ParentEmailSendErrorCode) {
    super(code)
    this.name = 'ParentEmailSendOrchestrationError'
    this.code = code
  }
}

export interface ParentEmailSendOrchestrationDependencies {
  getAccessToken(userId: string): Promise<string>
  sendGmailMessage(input: { accessToken: string; to: string; subject: string; body: string }): Promise<{ messageId: string }>
  markDraftSent(input: { draftId: string; userId: string; sentTo: string }): Promise<void>
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
}

export interface ParentEmailSendResult {
  messageId: string
}

// L'enseignant a deja relu le brouillon (et sa traduction eventuelle) dans la
// carte avant de cliquer sur Envoyer — cette orchestration ne reformule rien,
// elle transmet le texte final tel quel. Jamais declenchee par une intention
// de chat, toujours par l'action explicite du bouton (voir PRD).
export async function orchestrateParentEmailSend(
  input: {
    draftId: string
    userId: string
    to: string
    subject: string
    body: string
  },
  dependencies: ParentEmailSendOrchestrationDependencies
): Promise<ParentEmailSendResult> {
  const parsed = parentEmailSendInputSchema.parse({
    draftId: input.draftId,
    to: input.to,
    subject: input.subject,
    body: input.body,
  })

  const usage = await dependencies.checkUsage(input.userId)
  if (!usage.allowed) throw new ParentEmailSendOrchestrationError('PARENT_EMAIL_SEND_QUOTA_EXCEEDED')

  let accessToken: string
  try {
    accessToken = await dependencies.getAccessToken(input.userId)
  } catch (error) {
    await safeRefund(dependencies, input.userId)
    if (error instanceof GoogleAccessTokenError && error.code === 'GOOGLE_NOT_CONNECTED') {
      throw new ParentEmailSendOrchestrationError('GOOGLE_NOT_CONNECTED')
    }
    if (error instanceof GoogleAccessTokenError && error.code === 'GOOGLE_SCOPE_MISSING') {
      throw new ParentEmailSendOrchestrationError('GOOGLE_SCOPE_MISSING')
    }
    console.error('[agent:parent-email-send] jeton Google indisponible', error)
    throw new ParentEmailSendOrchestrationError('PARENT_EMAIL_SEND_FAILED')
  }

  try {
    const sent = await dependencies.sendGmailMessage({
      accessToken,
      to: parsed.to,
      subject: parsed.subject,
      body: parsed.body,
    })
    await dependencies.markDraftSent({ draftId: parsed.draftId, userId: input.userId, sentTo: parsed.to })
    return { messageId: sent.messageId }
  } catch (error) {
    console.error('[agent:parent-email-send] echec de l’envoi', error)
    await safeRefund(dependencies, input.userId)
    throw new ParentEmailSendOrchestrationError('PARENT_EMAIL_SEND_FAILED')
  }
}

async function safeRefund(dependencies: ParentEmailSendOrchestrationDependencies, userId: string) {
  try {
    await dependencies.refundUsage(userId)
  } catch {
    // Le remboursement ne doit pas masquer l'erreur initiale.
  }
}
