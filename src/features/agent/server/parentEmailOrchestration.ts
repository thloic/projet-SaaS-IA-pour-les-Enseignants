import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { StudentContextResult, StudentObservationContext, StudentEvaluationResultContext } from '../types/memory.types.ts'
import type { ParentEmailRegister } from '../schemas/parentEmailSchema.ts'
import {
  parentEmailExtractionSchema,
  resolveParentEmailExtraction,
  type ResolvedParentEmailRequest,
} from '../schemas/parentEmailIntentSchema.ts'
import type { AppLocale, ContentLanguage } from '@/features/i18n/locale'
import {
  buildClarificationResponse,
  buildStudentDataMissingResponse,
  buildStudentNotFoundResponse,
} from './agentResponses.ts'

const PARENT_EMAIL_DOCUMENT_LABEL = {
  fr: 'un courriel aux parents',
  en: 'a parent email',
  es: 'un correo a los padres',
}

export type ParentEmailOrchestrationErrorCode =
  | 'PARENT_EMAIL_QUOTA_EXCEEDED'
  | 'PARENT_EMAIL_GENERATION_FAILED'

export class ParentEmailOrchestrationError extends Error {
  readonly code: ParentEmailOrchestrationErrorCode

  constructor(code: ParentEmailOrchestrationErrorCode) {
    super(code)
    this.name = 'ParentEmailOrchestrationError'
    this.code = code
  }
}

export interface ParentEmailDraftRecord {
  studentId: string
  studentName: string
  classId: string | null
  register: ParentEmailRegister
  situation?: string
  subject: string
  body: string
}

export interface ParentEmailOrchestrationDependencies {
  extractParentEmailFields(message: string): Promise<unknown>
  getStudentContext(input: { studentQuery: string }): Promise<StudentContextResult>
  generateParentEmailDraft(input: {
    studentFullName: string
    register: ParentEmailRegister
    situation?: string
    observations: StudentObservationContext[]
    evaluationResults: StudentEvaluationResultContext[]
    language?: ContentLanguage
  }): Promise<{ subject: string; body: string }>
  saveParentEmailDraft(record: ParentEmailDraftRecord): Promise<{ id: string }>
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
}

// Un courriel sur le comportement ou l'echec n'a de sens que s'il s'ancre sur
// une observation/un resultat deja enregistre, OU sur une situation decrite
// explicitement par l'enseignant lui-meme (jamais une invention du modele).
// Pour "plagiat"/"autre", aucune donnee structuree n'existe en base : la
// situation decrite par l'enseignant est alors obligatoire.
function hasParentEmailGrounding(
  context: Extract<StudentContextResult, { kind: 'context' }>,
  resolved: ResolvedParentEmailRequest
): boolean {
  if (resolved.situation) return true
  if (resolved.register === 'comportement') {
    return context.observations.some((observation) => observation.category === 'behavior')
  }
  if (resolved.register === 'echec') {
    return context.evaluationResults.length > 0
  }
  return false
}

export async function orchestrateParentEmailRequest(
  input: {
    message: string
    trustedUserId: string
    contentLanguage?: ContentLanguage
    interfaceLanguage?: AppLocale
  },
  dependencies: ParentEmailOrchestrationDependencies
): Promise<AgentStructuredResponse | null> {
  const rawExtraction = await dependencies.extractParentEmailFields(input.message)
  const parsedExtraction = parentEmailExtractionSchema.safeParse(rawExtraction)
  console.log('[agent:parent-email] extraction brute', rawExtraction)
  if (!parsedExtraction.success) {
    console.log('[agent:parent-email] extraction invalide, schema rejete', parsedExtraction.error.issues)
    return null
  }

  const resolved = resolveParentEmailExtraction(parsedExtraction.data)
  console.log('[agent:parent-email] extraction resolue', resolved)
  if (!resolved) {
    console.log('[agent:parent-email] resolution null (eleve ou motif manquant) — repli vers le chat normal')
    return null
  }

  const context = await dependencies.getStudentContext({ studentQuery: resolved.studentQuery })
  console.log('[agent:parent-email] contexte eleve', context === null ? 'null' : context.kind)

  if (context === null) {
    return buildStudentNotFoundResponse(resolved.studentQuery, input.interfaceLanguage)
  }

  if (context.kind === 'ambiguous') {
    return buildClarificationResponse(context.candidates, input.interfaceLanguage)
  }

  const grounded = hasParentEmailGrounding(context, resolved)
  console.log('[agent:parent-email] ancrage suffisant ?', grounded, {
    hasSituation: Boolean(resolved.situation),
    register: resolved.register,
    observationCount: context.observations.length,
    evaluationCount: context.evaluationResults.length,
  })
  if (!grounded) {
    return buildStudentDataMissingResponse(
      context.student.fullName,
      PARENT_EMAIL_DOCUMENT_LABEL,
      input.interfaceLanguage
    )
  }

  const usage = await dependencies.checkUsage(input.trustedUserId)
  console.log('[agent:parent-email] quota', usage)
  if (!usage.allowed) throw new ParentEmailOrchestrationError('PARENT_EMAIL_QUOTA_EXCEEDED')

  try {
    const classId = context.classes[0]?.id ?? null
    console.log('[agent:parent-email] generation en cours…')
    const draft = await dependencies.generateParentEmailDraft({
      studentFullName: context.student.fullName,
      register: resolved.register,
      situation: resolved.situation,
      observations: context.observations,
      evaluationResults: context.evaluationResults,
      language: input.contentLanguage,
    })
    console.log('[agent:parent-email] brouillon genere', { subject: draft.subject, bodyLength: draft.body.length })

    const saved = await dependencies.saveParentEmailDraft({
      studentId: context.student.id,
      studentName: context.student.fullName,
      classId,
      register: resolved.register,
      situation: resolved.situation,
      subject: draft.subject,
      body: draft.body,
    })
    console.log('[agent:parent-email] brouillon enregistre', saved)

    const response: AgentStructuredResponse = {
      kind: 'parent_email_draft',
      studentId: context.student.id,
      draftId: saved.id,
      register: resolved.register,
      subject: draft.subject,
      body: draft.body,
      familyLanguage: context.student.familyLanguage,
      suggestedRecipientEmail: resolved.suggestedRecipientEmail,
    }
    console.log('[agent:parent-email] reponse structuree retournee', {
      kind: response.kind,
      draftId: 'draftId' in response ? response.draftId : undefined,
      familyLanguage: 'familyLanguage' in response ? response.familyLanguage : undefined,
    })
    return response
  } catch (error) {
    console.error('[agent:parent-email] echec de la generation', error)
    try {
      await dependencies.refundUsage(input.trustedUserId)
    } catch (refundError) {
      console.error('[agent:parent-email] remboursement du quota egalement en echec', refundError)
    }
    throw new ParentEmailOrchestrationError('PARENT_EMAIL_GENERATION_FAILED')
  }
}
