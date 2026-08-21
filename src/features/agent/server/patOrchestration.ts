import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { StudentContextResult } from '../types/memory.types.ts'
import type { PAT } from '../schemas/patSchema.ts'
import type { ResolvedDocumentTemplate } from '../types/documentTemplate.types.ts'
import type { AppLocale, ContentLanguage } from '@/features/i18n/locale'
import {
  buildClarificationResponse,
  buildStudentNotFoundResponse,
  buildTemplateMissingResponse,
} from './agentResponses.ts'
import { resolveDocumentTemplateContent, selectDocumentTemplate } from './documentTemplateResolution.ts'

export { selectDocumentTemplate } from './documentTemplateResolution.ts'

const PAT_DOCUMENT_LABEL = { fr: 'un PAT', en: 'a PAT', es: 'un PAT' }

export type PATOrchestrationErrorCode = 'PAT_QUOTA_EXCEEDED' | 'PAT_GENERATION_FAILED'

export class PATOrchestrationError extends Error {
  readonly code: PATOrchestrationErrorCode

  constructor(code: PATOrchestrationErrorCode) {
    super(code)
    this.name = 'PATOrchestrationError'
    this.code = code
  }
}

export interface PATOrchestrationDependencies {
  getStudentContext(input: { studentQuery: string }): Promise<StudentContextResult>
  fetchTemplatePdfBase64(path: string): Promise<string>
  generatePAT(input: {
    studentContext: Extract<StudentContextResult, { kind: 'context' }>
    language?: ContentLanguage
    documentTemplate: ResolvedDocumentTemplate
  }): Promise<PAT>
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
}

export async function orchestratePATRequest(
  input: {
    studentQuery: string
    trustedUserId: string
    contentLanguage?: ContentLanguage
    interfaceLanguage?: AppLocale
  },
  dependencies: PATOrchestrationDependencies
): Promise<AgentStructuredResponse> {
  const context = await dependencies.getStudentContext({ studentQuery: input.studentQuery })

  if (context === null) {
    return buildStudentNotFoundResponse(input.studentQuery, input.interfaceLanguage)
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
      PAT_DOCUMENT_LABEL
    )
  }

  const usage = await dependencies.checkUsage(input.trustedUserId)
  if (!usage.allowed) throw new PATOrchestrationError('PAT_QUOTA_EXCEEDED')

  try {
    const language = input.contentLanguage ?? 'fr'
    const documentTemplate = await resolveDocumentTemplateContent(
      selectedTemplate,
      dependencies.fetchTemplatePdfBase64
    )
    const pat = await dependencies.generatePAT({
      studentContext: context,
      language,
      documentTemplate,
    })
    return { kind: 'pat', studentId: context.student.id, language, pat }
  } catch {
    try {
      await dependencies.refundUsage(input.trustedUserId)
    } catch {
      // Le remboursement ne doit pas masquer l'erreur de génération initiale.
    }
    throw new PATOrchestrationError('PAT_GENERATION_FAILED')
  }
}
