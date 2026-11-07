import { z } from 'zod'

// Questionnaire / guide d'étude : une seule version, avec corrigé. Généré à la
// demande, affiché et téléchargé, jamais persisté. L'enseignant relit avant
// toute utilisation (principe 2 de CLAUDE.md).

export const studyQuestionTypeSchema = z.enum(['vrai_faux', 'choix_multiple', 'reponse_courte'])

export const studyQuestionSchema = z
  .object({
    type: studyQuestionTypeSchema,
    prompt: z.string().trim().min(5).max(600),
    choices: z.array(z.string().trim().min(1).max(200)).min(2).max(6).optional(),
    answer: z.string().trim().min(1).max(400),
    explanation: z.string().trim().max(400).optional(),
  })
  .superRefine((question, ctx) => {
    if (question.type === 'vrai_faux') {
      if (question.choices) {
        ctx.addIssue({ code: 'custom', path: ['choices'], message: 'Une question vrai/faux n’a pas de choix.' })
      }
      if (question.answer !== 'Vrai' && question.answer !== 'Faux') {
        ctx.addIssue({ code: 'custom', path: ['answer'], message: 'La réponse vrai/faux doit être « Vrai » ou « Faux ».' })
      }
    }
    if (question.type === 'choix_multiple') {
      if (!question.choices || question.choices.length < 3) {
        ctx.addIssue({ code: 'custom', path: ['choices'], message: 'Un choix multiple doit proposer au moins 3 choix.' })
      } else if (!question.choices.includes(question.answer)) {
        ctx.addIssue({ code: 'custom', path: ['answer'], message: 'La réponse doit figurer parmi les choix.' })
      }
    }
    if (question.type === 'reponse_courte' && question.choices) {
      ctx.addIssue({ code: 'custom', path: ['choices'], message: 'Une réponse courte n’a pas de choix.' })
    }
  })

export const studyQuestionnaireSchema = z.object({
  title: z.string().trim().min(3).max(160),
  questions: z.array(studyQuestionSchema).min(3).max(30),
})

export const studyQuestionnaireGenerationInputSchema = z.object({
  sourceContent: z.string().trim().min(20, 'Ajoutez le contenu à transformer en questionnaire.').max(30000),
  sourceTitle: z.string().trim().min(3, 'Ajoutez le titre du questionnaire.').max(160),
  subject: z.string().trim().min(1, 'Indiquez la matière.').max(100),
  level: z.string().trim().min(1, 'Indiquez le niveau.').max(100),
})

export type StudyQuestionType = z.infer<typeof studyQuestionTypeSchema>
export type StudyQuestion = z.infer<typeof studyQuestionSchema>
export type StudyQuestionnaire = z.infer<typeof studyQuestionnaireSchema>
export type StudyQuestionnaireGenerationInput = z.infer<typeof studyQuestionnaireGenerationInputSchema>
