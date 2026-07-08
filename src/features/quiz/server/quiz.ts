import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { generatedQuizSchema } from '@/features/quiz/schemas/quizSchema'
import type { QuizListItem, QuizRecord } from '@/features/quiz/types/quiz.types'

type QuizRow = Omit<QuizRecord, 'questions'> & {
  questions: unknown
}

function parseQuizRow(row: QuizRow): QuizRecord | null {
  const parsed = generatedQuizSchema.safeParse({
    title: row.title,
    gradingSystem: row.grading_system,
    questions: row.questions,
    totalPoints: Number(row.total_points),
  })

  if (!parsed.success) {
    console.error('[quiz] quiz stocke invalide', { quizId: row.id, issues: parsed.error.flatten() })
    return null
  }

  return {
    ...row,
    total_points: Number(row.total_points),
    questions: parsed.data.questions,
  }
}

export async function listMyQuizzes(): Promise<QuizListItem[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, user_id, source_document_id, title, subject, grading_system, total_points, questions, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) {
    console.error('[quiz] chargement liste refuse', error)
    throw new Error('Impossible de charger vos quiz pour le moment.')
  }

  return (data ?? [])
    .map((row) =>
      parseQuizRow({
        ...row,
        source_text_snapshot: '',
        subject: row.subject ?? 'Matiere non precisee',
      })
    )
    .filter((quiz): quiz is QuizRecord => quiz !== null)
    .map((quiz) => ({
      id: quiz.id,
      user_id: quiz.user_id,
      source_document_id: quiz.source_document_id,
      title: quiz.title,
      subject: quiz.subject,
      grading_system: quiz.grading_system,
      total_points: quiz.total_points,
      questions: quiz.questions,
      question_count: quiz.questions.length,
      created_at: quiz.created_at,
      updated_at: quiz.updated_at,
    }))
}

export async function getMyQuiz(id: string): Promise<QuizRecord | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[quiz] chargement detail refuse', error)
    throw new Error('Impossible de charger ce quiz pour le moment.')
  }

  if (!data) return null
  return parseQuizRow(data)
}
