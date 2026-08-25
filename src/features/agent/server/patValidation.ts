import { PATSchema, type PAT } from '../schemas/patSchema.ts'
import { containsNegativeLanguage } from '../../../lib/validation/negativeLanguage.ts'

export class PATValidationError extends Error {
  readonly code: 'INVALID_PAT' | 'NEGATIVE_NEED'

  constructor(code: 'INVALID_PAT' | 'NEGATIVE_NEED') {
    super(code)
    this.name = 'PATValidationError'
    this.code = code
  }
}

export function parseAndValidatePAT(value: unknown): PAT {
  const parsed = PATSchema.safeParse(value)
  if (!parsed.success) throw new PATValidationError('INVALID_PAT')

  const needs = [
    ...parsed.data.habiletes.besoins,
    ...(parsed.data.francisation?.besoins ?? []),
  ]
  if (containsNegativeLanguage(needs)) {
    throw new PATValidationError('NEGATIVE_NEED')
  }

  return parsed.data
}
