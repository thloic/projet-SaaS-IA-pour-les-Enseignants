import { z } from 'zod'

export const quizQuestionTypeSchema = z.enum(['multiple_choice', 'true_false', 'open'])

export const quizQuestionSchema = z
  .object({
    id: z.string().trim().min(1, 'Identifiant de question requis'),
    type: quizQuestionTypeSchema,
    prompt: z.string().trim().min(1, 'Enonce requis').max(1000, 'Enonce trop long'),
    options: z.array(z.string().trim().min(1, 'Option vide')).max(6, 'Trop d options'),
    correctAnswer: z.string().trim().min(1, 'Bonne reponse requise').max(1000, 'Reponse trop longue'),
    correctionGuide: z.string().trim().max(1500, 'Guide de correction trop long').nullable(),
    points: z.coerce.number().positive('Les points doivent etre positifs').max(100, 'Points trop eleves'),
  })
  .superRefine((question, ctx) => {
    if (question.type === 'multiple_choice') {
      if (question.options.length < 2) {
        ctx.addIssue({
          code: 'custom',
          message: 'Un QCM doit contenir au moins deux options',
          path: ['options'],
        })
      }
      if (!question.options.includes(question.correctAnswer)) {
        ctx.addIssue({
          code: 'custom',
          message: 'La bonne reponse doit faire partie des options',
          path: ['correctAnswer'],
        })
      }
    }

    if (question.type === 'true_false') {
      const validOptions =
        question.options.length === 2 &&
        question.options.includes('Vrai') &&
        question.options.includes('Faux')
      if (!validOptions) {
        ctx.addIssue({
          code: 'custom',
          message: 'Une question vrai/faux doit proposer Vrai et Faux',
          path: ['options'],
        })
      }
      if (question.correctAnswer !== 'Vrai' && question.correctAnswer !== 'Faux') {
        ctx.addIssue({
          code: 'custom',
          message: 'La bonne reponse doit etre Vrai ou Faux',
          path: ['correctAnswer'],
        })
      }
    }

    if (question.type === 'open') {
      if (question.options.length !== 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Une question ouverte ne doit pas contenir d options',
          path: ['options'],
        })
      }
      if (!question.correctionGuide?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Une question ouverte doit contenir un guide de correction',
          path: ['correctionGuide'],
        })
      }
    }
  })

export const generatedQuizSchema = z
  .object({
    title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long'),
    gradingSystem: z.enum(['20', '10', 'letter', 'percentage', 'letter_ca', 'levels']),
    questions: z.array(quizQuestionSchema).min(5, 'Le quiz doit contenir au moins 5 questions').max(10),
    totalPoints: z.coerce.number().positive('Le total des points doit etre positif').max(1000),
  })
  .superRefine((quiz, ctx) => {
    const computedTotal = quiz.questions.reduce((sum, question) => sum + question.points, 0)
    if (Math.abs(computedTotal - quiz.totalPoints) > 0.001) {
      ctx.addIssue({
        code: 'custom',
        message: 'Le total des points ne correspond pas aux questions',
        path: ['totalPoints'],
      })
    }
  })

export const quizGenerationInputSchema = z
  .object({
    sourceDocumentId: z.string().uuid().optional(),
    pastedText: z.string().trim().max(20000, 'Le contenu est limite a 20 000 caracteres').optional(),
    subject: z.string().trim().min(1, 'Choisissez une matiere').max(120, 'Matiere trop longue'),
    questionCount: z.coerce.number().int().min(5).max(10).default(5),
  })
  .refine((input) => input.sourceDocumentId || input.pastedText, {
    message: 'Selectionnez un document ou collez un contenu de cours',
    path: ['pastedText'],
  })

export const quizUpdateSchema = z.object({
  quizId: z.string().uuid(),
  title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long'),
  questions: z.array(quizQuestionSchema).min(5).max(10),
})

export type QuizQuestionTypeInput = z.infer<typeof quizQuestionTypeSchema>
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>
export type GeneratedQuizInput = z.infer<typeof generatedQuizSchema>
export type QuizGenerationInput = z.infer<typeof quizGenerationInputSchema>
export type QuizUpdateInput = z.infer<typeof quizUpdateSchema>
