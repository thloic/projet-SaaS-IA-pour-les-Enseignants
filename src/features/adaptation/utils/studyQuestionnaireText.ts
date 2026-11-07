import type { StudyQuestion, StudyQuestionnaire } from '../schemas/studyQuestionnaireSchema.ts'

const TYPE_LABELS: Record<StudyQuestion['type'], string> = {
  vrai_faux: 'Vrai ou faux',
  choix_multiple: 'Choix multiple',
  reponse_courte: 'Réponse courte',
}

export function studyQuestionTypeLabel(type: StudyQuestion['type']): string {
  return TYPE_LABELS[type]
}

// Texte brut pour téléchargement. Le corrigé est optionnel, pour que
// l'enseignant puisse distribuer la version élèves sans les réponses.
export function formatStudyQuestionnaireText(
  questionnaire: StudyQuestionnaire,
  options: { withAnswers: boolean }
): string {
  const questions = questionnaire.questions.map((question, index) => {
    const lines = [`${index + 1}. ${question.prompt}`]
    if (question.choices) {
      question.choices.forEach((choice, choiceIndex) => {
        lines.push(`   ${String.fromCharCode(65 + choiceIndex)}) ${choice}`)
      })
    }
    return lines.join('\n')
  })

  const parts = [questionnaire.title, '', ...questions.flatMap((block) => [block, ''])]

  if (options.withAnswers) {
    parts.push('CORRIGÉ', '')
    questionnaire.questions.forEach((question, index) => {
      const explanation = question.explanation ? ` — ${question.explanation}` : ''
      parts.push(`${index + 1}. ${question.answer}${explanation}`)
    })
  }

  return parts.join('\n').trimEnd() + '\n'
}
