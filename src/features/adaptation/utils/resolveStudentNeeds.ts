import type { VariantType } from '@/features/adaptation/schemas/adaptationSchema'

const DYS_PATTERN = /\b(dys\w*|trouble de lecture)/i
const ADHD_PATTERN = /\b(tdah|t\.?d\.?a\.?h|attention\w*|hyperactiv\w*|concentration)/i
const ENRICHMENT_PATTERN = /\b(enrich\w*|avanc\w*|douance|haut potentiel|hpi|précoce|precoce)/i
const SUPPORT_PATTERN = /\b(soutien|difficult\w*|retard\w*|fragile|allophone|nouvellement arrivé|pei|ppi)/i

export function resolveStudentVariant(
  needs: string[],
  interventionPlan = false
): VariantType {
  const value = needs.join(' ')

  if (DYS_PATTERN.test(value)) return 'dys'
  if (ADHD_PATTERN.test(value)) return 'adhd'
  if (ENRICHMENT_PATTERN.test(value)) return 'enrichment'
  if (SUPPORT_PATTERN.test(value) || interventionPlan) return 'support'
  return 'standard'
}

export function summarizeAnonymousNeeds(
  students: Array<{ needs: string[]; interventionPlan: boolean }>
): string[] {
  const counts = new Map<VariantType, number>()

  for (const student of students) {
    const type = resolveStudentVariant(student.needs, student.interventionPlan)
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }

  return Array.from(counts.entries()).map(([type, count]) => `${type}: ${count}`)
}
