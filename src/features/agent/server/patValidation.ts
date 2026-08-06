import { PATSchema, type PAT } from '../schemas/patSchema.ts'

const NEGATIVE_DIRECT_PATTERNS = [
  /en\s+difficult[eé]/iu,
  /incapable/iu,
  /faible/iu,
  /[eé]choue/iu,
  /ne\s+[^.!?]{0,60}\s+pas/iu,
]

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
  if (needs.some((need) => NEGATIVE_DIRECT_PATTERNS.some((pattern) => pattern.test(need)))) {
    throw new PATValidationError('NEGATIVE_NEED')
  }

  return parsed.data
}
