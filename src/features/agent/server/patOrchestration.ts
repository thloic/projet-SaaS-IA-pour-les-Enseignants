import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { StudentContextResult } from '../types/memory.types.ts'
import type { PAT } from '../schemas/patSchema.ts'
import type { AppLocale, ContentLanguage } from '@/features/i18n/locale'

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
  generatePAT(input: {
    studentContext: Extract<StudentContextResult, { kind: 'context' }>
    language?: ContentLanguage
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
    const message = input.interfaceLanguage === 'es'
      ? `No encuentro ningún alumno que corresponda a «${input.studentQuery}» en tus clases.`
      : input.interfaceLanguage === 'en'
        ? `I could not find a student matching “${input.studentQuery}” in your classes.`
        : `Je ne trouve aucun élève correspondant à « ${input.studentQuery} » dans vos classes.`
    return {
      kind: 'student_not_found',
      message,
    }
  }

  if (context.kind === 'ambiguous') {
    const message = input.interfaceLanguage === 'es'
      ? 'Hay varios alumnos que corresponden a ese nombre. ¿Cuál quieres utilizar?'
      : input.interfaceLanguage === 'en'
        ? 'Several students match that name. Which one would you like to use?'
        : 'Plusieurs élèves correspondent à ce prénom. Lequel souhaitez-vous utiliser?'
    return {
      kind: 'clarification',
      message,
      candidates: context.candidates.map((candidate) => ({
        id: candidate.id,
        fullName: candidate.fullName,
        classes: candidate.classes.map((classroom) => classroom.name),
      })),
    }
  }

  const usage = await dependencies.checkUsage(input.trustedUserId)
  if (!usage.allowed) throw new PATOrchestrationError('PAT_QUOTA_EXCEEDED')

  try {
    const language = input.contentLanguage ?? 'fr'
    const pat = await dependencies.generatePAT({ studentContext: context, language })
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
