import type { GradingSystem } from '@/features/profile/types/profile.types'
import type { QuizQuestion } from '@/features/quiz/types/quiz.types'

interface ExportQuizPdfInput {
  title: string
  teacherName: string
  subject: string
  generatedAt: string
  gradingSystem: GradingSystem
  questions: QuizQuestion[]
  totalPoints: number
  onBlockedPopup?: () => void
}

export function gradingLabel(gradingSystem: GradingSystem, totalPoints: number) {
  if (gradingSystem === 'percentage') return `${totalPoints} pts - affichage sur 100 %`
  if (gradingSystem === '20') return `${totalPoints} pts - affichage sur 20`
  if (gradingSystem === '10') return `${totalPoints} pts - affichage sur 10`
  if (gradingSystem === 'letter_ca') return `${totalPoints} pts - lettres A a R`
  if (gradingSystem === 'levels') return `${totalPoints} pts - niveaux 1 a 4`
  return `${totalPoints} pts`
}

export function questionLabel(type: QuizQuestion['type']) {
  if (type === 'multiple_choice') return 'QCM'
  if (type === 'true_false') return 'Vrai/Faux'
  return 'Ouverte'
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function exportQuizPdf({
  title,
  teacherName,
  subject,
  generatedAt,
  gradingSystem,
  questions,
  totalPoints,
  onBlockedPopup,
}: ExportQuizPdfInput) {
  const printableQuestions = questions
    .map((question, index) => {
      const options = question.options.map((option) => `<li>${escapeHtml(option)}</li>`).join('')
      const optionsHtml = options ? `<ol type="A">${options}</ol>` : ''
      const guideHtml =
        question.type === 'open' && question.correctionGuide
          ? `<p class="guide"><strong>Guide de correction :</strong> ${escapeHtml(question.correctionGuide)}</p>`
          : ''

      return `
        <section class="question">
          <div class="question-head">
            <h2>${index + 1}. ${escapeHtml(question.prompt)}</h2>
            <span>${escapeHtml(questionLabel(question.type))} - ${question.points} pt${question.points > 1 ? 's' : ''}</span>
          </div>
          ${optionsHtml}
          <p class="answer"><strong>Réponse attendue :</strong> ${escapeHtml(question.correctAnswer)}</p>
          ${guideHtml}
        </section>
      `
    })
    .join('')

  const printableHtml = `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.45;
          }
          header {
            border-bottom: 2px solid #111827;
            margin-bottom: 24px;
            padding-bottom: 16px;
          }
          h1 { margin: 0 0 8px; font-size: 28px; }
          .meta { color: #4b5563; font-size: 13px; }
          .meta-grid {
            display: grid;
            gap: 4px 16px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: 10px;
          }
          .meta-grid div { min-width: 0; }
          .question {
            break-inside: avoid;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            margin-bottom: 16px;
            padding: 16px;
          }
          .question-head {
            align-items: flex-start;
            display: flex;
            gap: 16px;
            justify-content: space-between;
          }
          h2 { font-size: 16px; margin: 0 0 10px; }
          .question-head span {
            color: #4b5563;
            flex: 0 0 auto;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
          }
          ol { margin: 8px 0 12px 24px; padding: 0; }
          li { margin: 4px 0; }
          .answer, .guide { font-size: 13px; margin: 8px 0 0; }
          @page { margin: 18mm; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(title)}</h1>
          <div class="meta">
            ${questions.length} questions - ${escapeHtml(gradingLabel(gradingSystem, totalPoints))}
          </div>
          <div class="meta meta-grid">
            <div><strong>Enseignant :</strong> ${escapeHtml(teacherName || 'Enseignant')}</div>
            <div><strong>Date :</strong> ${escapeHtml(new Date(generatedAt).toLocaleDateString('fr-CA'))}</div>
            <div><strong>Matière :</strong> ${escapeHtml(subject || 'Matiere non precisee')}</div>
            <div><strong>Barème :</strong> ${escapeHtml(gradingLabel(gradingSystem, totalPoints))}</div>
          </div>
        </header>
        ${printableQuestions}
      </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    onBlockedPopup?.()
    return false
  }

  printWindow.document.open()
  printWindow.document.write(printableHtml)
  printWindow.document.close()
  printWindow.focus()
  window.setTimeout(() => {
    printWindow.print()
  }, 250)
  return true
}
