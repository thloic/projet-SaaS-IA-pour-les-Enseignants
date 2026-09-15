import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { StudentContextResult } from '../types/memory.types.ts'
import type { StudentEvaluationResultContext, StudentObservationContext } from '../types/memory.types.ts'
import {
  bulletinExtractionSchema,
  resolveBulletinExtraction,
} from '../schemas/bulletinIntentSchema.ts'
import type { BulletinTone } from '@/features/bulletin/schemas/bulletinSchema'
import type { ResolvedDocumentTemplate } from '../types/documentTemplate.types.ts'
import type { AppLocale } from '@/features/i18n/locale'
import {
  buildClarificationResponse,
  buildStudentNotFoundResponse,
  buildStudentDataMissingResponse,
  buildTemplateMissingResponse,
} from './agentResponses.ts'
import { resolveDocumentTemplateContent, selectDocumentTemplate } from './documentTemplateResolution.ts'

const BULLETIN_DOCUMENT_LABEL = {
  fr: 'un commentaire de bulletin',
  en: 'a report card comment',
  es: 'un comentario de boletín',
}

export type BulletinOrchestrationErrorCode =
  | 'BULLETIN_QUOTA_EXCEEDED'
  | 'BULLETIN_GENERATION_FAILED'

export class BulletinOrchestrationError extends Error {
  readonly code: BulletinOrchestrationErrorCode

  constructor(code: BulletinOrchestrationErrorCode) {
    super(code)
    this.name = 'BulletinOrchestrationError'
    this.code = code
  }
}

export interface BulletinCommentRecord {
  studentId: string
  studentName: string
  classId: string
  subject: string
  grade: string
  observations?: string
  tone: BulletinTone
  comment: string
}

export interface BulletinOrchestrationDependencies {
  extractBulletinFields(message: string): Promise<unknown>
  getStudentContext(input: { studentQuery: string }): Promise<StudentContextResult>
  fetchTemplatePdfBase64(path: string): Promise<string>
  generateBulletinComment(input: {
    studentName: string
    subject: string
    grade: string
    observations?: string
    evaluationResults: StudentEvaluationResultContext[]
    studentObservations: StudentObservationContext[]
    tone: BulletinTone
    documentTemplate: ResolvedDocumentTemplate
  }): Promise<{ comment: string }>
  saveBulletinComment(record: BulletinCommentRecord): Promise<void>
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
}

// Contrairement au PAT, une demande de bulletin peut etre incomplete (matiere
// ou note absente du message) : dans ce cas on retourne null pour laisser la
// conversation normale continuer, plutot que de bloquer techniquement —
// l'agent redemandera l'information manquante dans le fil de discussion.
export async function orchestrateBulletinRequest(
  input: {
    message: string
    trustedUserId: string
    interfaceLanguage?: AppLocale
  },
  dependencies: BulletinOrchestrationDependencies
): Promise<AgentStructuredResponse | null> {
  const rawExtraction = await dependencies.extractBulletinFields(input.message)
  const parsedExtraction = bulletinExtractionSchema.safeParse(rawExtraction)
  if (!parsedExtraction.success) return null

  const resolved = resolveBulletinExtraction(parsedExtraction.data)
  if (!resolved) return null

  const context = await dependencies.getStudentContext({ studentQuery: resolved.studentQuery })

  if (context === null) {
    return buildStudentNotFoundResponse(resolved.studentQuery, input.interfaceLanguage)
  }

  if (context.kind === 'ambiguous') {
    return buildClarificationResponse(context.candidates, input.interfaceLanguage)
  }

  const selectedTemplate = selectDocumentTemplate(context.classes)
  if (!selectedTemplate) {
    return buildTemplateMissingResponse(
      context.student.fullName,
      context.classes,
      input.interfaceLanguage,
      BULLETIN_DOCUMENT_LABEL
    )
  }

  const evaluationResults = context.evaluationResults.filter(
    ({ classId }) => classId === selectedTemplate.classId
  )
  if (evaluationResults.length === 0 && context.observations.length === 0) {
    return buildStudentDataMissingResponse(context.student.fullName, input.interfaceLanguage)
  }

  const usage = await dependencies.checkUsage(input.trustedUserId)
  if (!usage.allowed) throw new BulletinOrchestrationError('BULLETIN_QUOTA_EXCEEDED')

  try {
    const documentTemplate = await resolveDocumentTemplateContent(
      selectedTemplate,
      dependencies.fetchTemplatePdfBase64
    )
    const generated = await dependencies.generateBulletinComment({
      studentName: context.student.fullName,
      subject: resolved.subject,
      grade: resolved.grade,
      observations: resolved.observations,
      evaluationResults,
      studentObservations: context.observations,
      tone: resolved.tone,
      documentTemplate,
    })

    await dependencies.saveBulletinComment({
      studentId: context.student.id,
      studentName: context.student.fullName,
      classId: selectedTemplate.classId,
      subject: resolved.subject,
      grade: resolved.grade,
      observations: resolved.observations,
      tone: resolved.tone,
      comment: generated.comment,
    })

    return {
      kind: 'bulletin',
      studentId: context.student.id,
      subject: resolved.subject,
      grade: resolved.grade,
      comment: generated.comment,
    }
  } catch (error) {
    console.error('[agent:bulletin] echec de la generation ou sauvegarde', error)
    try {
      await dependencies.refundUsage(input.trustedUserId)
    } catch {
      // Le remboursement ne doit pas masquer l'erreur de génération initiale.
    }
    throw new BulletinOrchestrationError('BULLETIN_GENERATION_FAILED')
  }
}
