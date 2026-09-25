import type { GeneratedCorrection } from '../schemas/correctionSchema.ts'

export function formatCorrectionComment(generated: GeneratedCorrection): string {
  if (generated.rubricAssessments.length === 0) return generated.comment
  const assessmentLines = generated.rubricAssessments.map((assessment) => {
    const score = assessment.score !== null && assessment.maxScore !== null
      ? ` — score proposé : ${assessment.score}/${assessment.maxScore}`
      : ''
    return `${assessment.criterion}${score}\nPreuve : ${assessment.evidence}`
  })
  return ['Analyse selon votre grille :', ...assessmentLines, '', generated.comment].join('\n\n')
}
