'use client'

import Link from 'next/link'
import { startTransition, useActionState, useEffect, useMemo, useState } from 'react'
import { BookOpen, Edit3, Save, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConfirm } from '@/components/shared/ConfirmProvider'
import { useToast } from '@/components/shared/ToastProvider'
import {
  deleteQuizAction,
  updateQuizAction,
  type DeleteQuizState,
  type UpdateQuizState,
} from '@/features/quiz/server/quiz.actions'
import { exportQuizPdf } from '@/features/quiz/utils/exportQuizPdf'
import type { QuizListItem } from '@/features/quiz/types/quiz.types'

const initialUpdateState: UpdateQuizState = { error: null, success: false }
const initialDeleteState: DeleteQuizState = { error: null }

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
  const confirm = useConfirm()
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
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteQuizAction, initialDeleteState)
  const totalPoints = useMemo(
    () => quiz.questions.reduce((sum, question) => sum + Number(question.points || 0), 0),
    [quiz.questions]
  )

  useEffect(() => {
    if (updateState.error) showToast(updateState.error, 'error')
    if (updateState.success) showToast('QCM renommé avec succès.', 'success')
  }, [showToast, updateState.error, updateState.success])

  useEffect(() => {
    if (deleteState.error) showToast(deleteState.error, 'error')
  }, [deleteState.error, showToast])

  async function handleDeleteClick() {
    const confirmed = await confirm({
      title: 'Supprimer ce QCM ?',
      message: `« ${title} » sera définitivement supprimé.`,
      confirmLabel: 'Supprimer',
    })
    if (!confirmed) return

    const formData = new FormData()
    formData.set('quizId', quiz.id)
    startTransition(() => {
      deleteAction(formData)
    })
  }

  function handleExportClick() {
    const didStartExport = exportQuizPdf({
      title,
      teacherName,
      subject: quiz.subject,
      generatedAt: quiz.created_at,
      gradingSystem: quiz.grading_system,
      questions: quiz.questions,
      totalPoints,
      onBlockedPopup: () =>
        showToast('Impossible d’ouvrir la fenêtre d’export. Autorisez les popups puis réessayez.', 'error'),
    })
    if (didStartExport) {
      showToast('Export PDF lancé. Choisissez “Enregistrer en PDF” dans la fenêtre d’impression.', 'success')
    }
  }

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
            <Badge variant="outline">{quiz.question_count} questions</Badge>
            <Badge variant="outline">{quiz.total_points} pts</Badge>
            <Badge variant="outline">{quiz.subject}</Badge>
            <Badge variant="outline">{new Date(quiz.created_at).toLocaleDateString('fr-CA')}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-4 md:flex md:shrink-0 md:flex-wrap md:justify-end">
          {isRenaming ? (
            <Button type="submit" disabled={isUpdating} className="min-h-9 whitespace-normal text-white">
              <Save size={14} /> {isUpdating ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => setIsRenaming(true)} className="min-h-9 whitespace-normal">
              <Edit3 size={14} /> Renommer
            </Button>
          )}
          <Button asChild type="button" variant="outline" className="min-h-9 whitespace-normal">
            <Link href={`/quiz/${quiz.id}`}>
              <Edit3 size={14} /> Modifier
            </Link>
          </Button>
          <Button type="button" variant="outline" onClick={handleExportClick} className="min-h-9 whitespace-normal">
            <BookOpen size={14} /> PDF
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDeleteClick} className="min-h-9 whitespace-normal">
            <Trash2 size={14} /> {isDeleting ? 'Suppression…' : 'Supprimer'}
          </Button>
        </div>
      </div>
    </form>
  )
}
