import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import {
  documentModificationExtractionSchema,
  resolveDocumentModification,
} from '../schemas/documentModificationSchema.ts'
import type { PAT } from '../schemas/patSchema.ts'
import type {
  StudentContext,
  StudentContextResult,
  StudentEvaluationResultContext,
  StudentObservationContext,
} from '../types/memory.types.ts'
import type { ResolvedDocumentTemplate } from '../types/documentTemplate.types.ts'
import type {
  NewGeneratedDocument,
  StoredGeneratedDocument,
} from '../../generated-documents/types/generatedDocument.types.ts'
import type { AppLocale, ContentLanguage } from '../../i18n/locale.ts'
import {
  buildClarificationResponse,
  buildDocumentNotFoundForModificationResponse,
  buildStudentDataMissingResponse,
  buildStudentNotFoundResponse,
  buildTemplateMissingResponse,
} from './agentResponses.ts'
import {
  resolveDocumentTemplateContent,
  selectDocumentTemplate,
} from './documentTemplateResolution.ts'

const DOCUMENT_LABELS = {
  pat: { fr: 'un PAT', en: 'a support plan', es: 'un PAT' },
  bulletin: { fr: 'un commentaire de bulletin', en: 'a report card comment', es: 'un comentario de boletín' },
} as const

export type DocumentModificationErrorCode =
  | 'DOCUMENT_MODIFICATION_QUOTA_EXCEEDED'
  | 'DOCUMENT_MODIFICATION_FAILED'

export class DocumentModificationError extends Error {
  readonly code: DocumentModificationErrorCode

  constructor(code: DocumentModificationErrorCode) {
    super(code)
    this.name = 'DocumentModificationError'
    this.code = code
  }
}

export interface DocumentModificationDependencies {
  extractModificationFields(message: string): Promise<unknown>
  getStudentContext(input: { studentQuery: string }): Promise<StudentContextResult>
  findLatestDocument(
    userId: string,
    studentId: string,
    documentType: 'pat' | 'bulletin'
  ): Promise<StoredGeneratedDocument | null>
  fetchTemplatePdfBase64(path: string): Promise<string>
  regeneratePAT(input: {
    studentContext: StudentContext
    language: ContentLanguage
    documentTemplate: ResolvedDocumentTemplate
    previousPat: PAT
    modificationInstruction: string
  }): Promise<PAT>
  regenerateBulletinComment(input: {
    studentContext: StudentContext
    previousDocument: Extract<StoredGeneratedDocument, { documentType: 'bulletin' }>
    evaluationResults: StudentEvaluationResultContext[]
    studentObservations: StudentObservationContext[]
    documentTemplate: ResolvedDocumentTemplate
    modificationInstruction: string
  }): Promise<{ comment: string }>
  saveDocument(document: NewGeneratedDocument): Promise<void>
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
}

export async function orchestrateDocumentModification(
  input: {
    message: string
    trustedUserId: string
    contentLanguage?: ContentLanguage
    interfaceLanguage?: AppLocale
  },
  dependencies: DocumentModificationDependencies
): Promise<AgentStructuredResponse | null> {
  const extracted = documentModificationExtractionSchema.safeParse(
    await dependencies.extractModificationFields(input.message)
  )
  if (!extracted.success) return null
  const resolved = resolveDocumentModification(extracted.data)
  if (!resolved) return null

  const context = await dependencies.getStudentContext({ studentQuery: resolved.studentQuery })
  if (context === null) {
    return buildStudentNotFoundResponse(resolved.studentQuery, input.interfaceLanguage)
  }
  if (context.kind === 'ambiguous') {
    return buildClarificationResponse(context.candidates, input.interfaceLanguage)
  }

  const previous = await dependencies.findLatestDocument(
    input.trustedUserId,
    context.student.id,
    resolved.documentType
  )
  if (!previous || previous.documentType !== resolved.documentType) {
    return buildDocumentNotFoundForModificationResponse(
      context.student.fullName,
      resolved.documentType,
      input.interfaceLanguage
    )
  }

  const matchingClasses = previous.classId
    ? context.classes.filter(({ id }) => id === previous.classId)
    : context.classes
  const selectedTemplate = selectDocumentTemplate(matchingClasses)
  if (!selectedTemplate) {
    return buildTemplateMissingResponse(
      context.student.fullName,
      matchingClasses.length > 0 ? matchingClasses : context.classes,
      input.interfaceLanguage,
      DOCUMENT_LABELS[resolved.documentType]
    )
  }

  const evaluationResults = context.evaluationResults.filter(
    ({ classId }) => classId === selectedTemplate.classId
  )
  if (
    resolved.documentType === 'bulletin' &&
    evaluationResults.length === 0 &&
    context.observations.length === 0
  ) {
    return buildStudentDataMissingResponse(context.student.fullName, input.interfaceLanguage)
  }

  const usage = await dependencies.checkUsage(input.trustedUserId)
  if (!usage.allowed) {
    throw new DocumentModificationError('DOCUMENT_MODIFICATION_QUOTA_EXCEEDED')
  }

  try {
    const documentTemplate = await resolveDocumentTemplateContent(
      selectedTemplate,
      dependencies.fetchTemplatePdfBase64
    )
    if (previous.documentType === 'pat') {
      const language = previous.language ?? input.contentLanguage ?? 'fr'
      const pat = await dependencies.regeneratePAT({
        studentContext: context,
        language,
        documentTemplate,
        previousPat: previous.pat,
        modificationInstruction: resolved.instruction,
      })
      await dependencies.saveDocument({
        documentType: 'pat',
        studentId: context.student.id,
        classId: selectedTemplate.classId,
        language,
        pat,
      })
      return { kind: 'pat', studentId: context.student.id, language, pat }
    }

    const generated = await dependencies.regenerateBulletinComment({
      studentContext: context,
      previousDocument: previous,
      evaluationResults,
      studentObservations: context.observations,
      documentTemplate,
      modificationInstruction: resolved.instruction,
    })
    await dependencies.saveDocument({
      documentType: 'bulletin',
      studentId: context.student.id,
      studentName: context.student.fullName,
      classId: selectedTemplate.classId,
      subject: previous.subject,
      grade: previous.grade,
      observations: previous.observations,
      tone: previous.tone,
      comment: generated.comment,
    })
    return {
      kind: 'bulletin',
      studentId: context.student.id,
      subject: previous.subject,
      grade: previous.grade,
      comment: generated.comment,
    }
  } catch (error) {
    console.error('[agent:document-modification] echec de la generation ou sauvegarde', error)
    try {
      await dependencies.refundUsage(input.trustedUserId)
    } catch {
      // Le remboursement ne doit pas masquer l’échec initial.
    }
    throw new DocumentModificationError('DOCUMENT_MODIFICATION_FAILED')
  }
}
