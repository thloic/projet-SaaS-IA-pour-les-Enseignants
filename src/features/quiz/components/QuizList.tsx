'use client'

import { useActionState, useEffect, useState } from 'react'
import { Edit3, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import { updateQuizAction, type UpdateQuizState } from '@/features/quiz/server/quiz.actions'
import QuizActions from '@/features/quiz/components/QuizActions'
import type { QuizListItem } from '@/features/quiz/types/quiz.types'

const initialUpdateState: UpdateQuizState = { error: null, success: false }

interface QuizListProps {
  quizzes: QuizListItem[]
  teacherName: string
}

export default function QuizList({ quizzes, teacherName }: QuizListProps) {
  if (quizzes.length === 0) return null

  return (
    <div className="space-y-3">
      {quizzes.map((quiz) => (
        <QuizListCard key={quiz.id} quiz={quiz} teacherName={teacherName} />
      ))}
    </div>
  )
}

function QuizListCard({ quiz, teacherName }: { quiz: QuizListItem; teacherName: string }) {
  const { showToast } = useToast()
  const { locale, t } = useAppLocale()
  const [title, setTitle] = useState(quiz.title)
  const [isRenaming, setIsRenaming] = useState(false)
  const [updateState, updateAction, isUpdating] = useActionState(
    async (prevState: UpdateQuizState, formData: FormData) => {
      const result = await updateQuizAction(prevState, formData)
      if (result.success) setIsRenaming(false)
      return result
    },
    initialUpdateState
  )

  useEffect(() => {
    if (updateState.error) showToast(updateState.error, 'error')
    if (updateState.success) showToast(t.quiz.renamed, 'success')
  }, [showToast, t, updateState.error, updateState.success])

  return (
    <form action={updateAction} className="rounded-xl border border-border bg-card/40 p-3 sm:rounded-2xl sm:p-4">
      <input type="hidden" name="quizId" value={quiz.id} />
      <input type="hidden" name="questions" value={JSON.stringify(quiz.questions)} />

      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <Input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full bg-muted/40"
            />
          ) : (
            <>
              <input type="hidden" name="title" value={title} />
              <p className="break-words text-sm font-semibold sm:truncate">{title}</p>
            </>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{quiz.question_count} {t.quiz.questions}</Badge>
            <Badge variant="outline">{quiz.total_points} {t.quiz.points}</Badge>
            <Badge variant="outline">{quiz.subject}</Badge>
            <Badge variant="outline">{new Date(quiz.created_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}</Badge>
          </div>
        </div>

        <div className="md:shrink-0">
          {isRenaming ? (
            <Button type="submit" disabled={isUpdating} className="min-h-9 whitespace-normal text-white">
              <Save size={14} /> {isUpdating ? t.quiz.saving : t.quiz.save}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setIsRenaming(true)} className="min-h-9 whitespace-normal">
              <Edit3 size={14} /> {t.quiz.rename}
            </Button>
          )}
          {!isRenaming && <QuizActions quiz={quiz} teacherName={teacherName} title={title} redirectTo="/quiz" />}
        </div>
      </div>
    </form>
  )
}
