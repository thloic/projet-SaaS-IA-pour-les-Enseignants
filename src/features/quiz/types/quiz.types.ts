import type { z } from 'zod'
import type {
  generatedQuizSchema,
  quizGenerationInputSchema,
  quizQuestionSchema,
  quizQuestionTypeSchema,
  quizUpdateSchema,
} from '@/features/quiz/schemas/quizSchema'
import type { GradingSystem } from '@/features/profile/types/profile.types'

export type QuestionType = z.infer<typeof quizQuestionTypeSchema>
export type QuizQuestion = z.infer<typeof quizQuestionSchema>
export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>
export type QuizGenerationInput = z.infer<typeof quizGenerationInputSchema>
export type QuizUpdateInput = z.infer<typeof quizUpdateSchema>

export interface QuizRecord {
  id: string
  user_id: string
  source_document_id: string | null
  title: string
  subject: string
  source_text_snapshot: string
  grading_system: GradingSystem
  total_points: number
  questions: QuizQuestion[]
  created_at: string
  updated_at: string
}

export type QuizListItem = Omit<QuizRecord, 'source_text_snapshot'> & {
  question_count: number
}
