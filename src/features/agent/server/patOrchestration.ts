import type { AgentStructuredResponse } from '../schemas/agentSchema.ts'
import type { StudentContextResult } from '../types/memory.types.ts'
import type { PAT } from '../schemas/patSchema.ts'

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
  }): Promise<PAT>
  checkUsage(userId: string): Promise<{ allowed: boolean }>
  refundUsage(userId: string): Promise<unknown>
}

export async function orchestratePATRequest(
  input: { studentQuery: string; trustedUserId: string },
  dependencies: PATOrchestrationDependencies
): Promise<AgentStructuredResponse> {
  const context = await dependencies.getStudentContext({ studentQuery: input.studentQuery })

  if (context === null) {
    return {
      kind: 'student_not_found',
      message: `Je ne trouve aucun élève correspondant à « ${input.studentQuery} » dans vos classes.`,
    }
  }

  if (context.kind === 'ambiguous') {
    return {
      kind: 'clarification',
      message: 'Plusieurs élèves correspondent à ce prénom. Lequel souhaitez-vous utiliser?',
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
    const pat = await dependencies.generatePAT({ studentContext: context })
    return { kind: 'pat', studentId: context.student.id, pat }
  } catch {
    try {
      await dependencies.refundUsage(input.trustedUserId)
    } catch {
      // Le remboursement ne doit pas masquer l'erreur de génération initiale.
    }
    throw new PATOrchestrationError('PAT_GENERATION_FAILED')
  }
}
