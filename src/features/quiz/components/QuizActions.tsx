'use client'

import Link from 'next/link'
import { startTransition, useActionState, useEffect, useMemo } from 'react'
import { BookOpen, Edit3, Eye, Share2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/shared/ConfirmProvider'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import { deleteQuizAction, type DeleteQuizState } from '@/features/quiz/server/quiz.actions'
import { exportQuizPdf } from '@/features/quiz/utils/exportQuizPdf'
import type { QuizListItem } from '@/features/quiz/types/quiz.types'

const initialDeleteState: DeleteQuizState = { error: null }

interface QuizActionsProps {
  quiz: QuizListItem
  teacherName: string
  title?: string
  redirectTo?: string
  compact?: boolean
  showPdf?: boolean
  showDelete?: boolean
}

export default function QuizActions({
  quiz,
  teacherName,
  title = quiz.title,
  redirectTo = '/quiz',
  compact = false,
  showPdf = true,
  showDelete = true,
}: QuizActionsProps) {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const { t } = useAppLocale()
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteQuizAction, initialDeleteState)
  const totalPoints = useMemo(
    () => quiz.questions.reduce((sum, question) => sum + Number(question.points || 0), 0),
    [quiz.questions]
  )
  const buttonClass = compact
    ? 'min-h-8 w-full px-2 text-xs whitespace-normal min-[520px]:w-auto'
    : 'min-h-9 w-full whitespace-normal min-[520px]:w-auto'

  useEffect(() => {
    if (deleteState.error) showToast(deleteState.error, 'error')
  }, [deleteState.error, showToast])

  async function handleDeleteClick() {
    const confirmed = await confirm({
      title: t.quiz.deleteTitle,
      message: `“${title}” ${t.quiz.deleteMessage}`,
      confirmLabel: t.quiz.delete,
    })
    if (!confirmed) return

    const formData = new FormData()
    formData.set('quizId', quiz.id)
    formData.set('redirectTo', redirectTo)
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
        showToast(t.quiz.popupBlocked, 'error'),
    })
    if (didStartExport) {
      showToast(t.quiz.exportStarted, 'success')
    }
  }

  async function handleShareClick() {
    const quizUrl = `${window.location.origin}/quiz/${quiz.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title, url: quizUrl })
        return
      }

      await navigator.clipboard.writeText(quizUrl)
      showToast(t.quiz.linkCopied, 'success')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      showToast(t.quiz.shareError, 'error')
    }
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2 min-[520px]:flex min-[520px]:flex-wrap min-[520px]:justify-end">
      <Button asChild type="button" variant="outline" className={buttonClass}>
        <Link href={`/quiz/${quiz.id}`}>
          <Eye size={14} /> {t.quiz.view}
        </Link>
      </Button>
      <Button asChild type="button" variant="outline" className={buttonClass}>
        <Link href={`/quiz/${quiz.id}`}>
          <Edit3 size={14} /> {t.quiz.edit}
        </Link>
      </Button>
      {showPdf && (
        <Button type="button" variant="outline" onClick={handleExportClick} className={buttonClass}>
          <BookOpen size={14} /> {t.quiz.pdf}
        </Button>
      )}
      <Button type="button" variant="outline" onClick={handleShareClick} className={buttonClass}>
        <Share2 size={14} /> {t.quiz.share}
      </Button>
      {showDelete && (
        <Button
          type="button"
          variant="destructive"
          disabled={isDeleting}
          onClick={handleDeleteClick}
          className={buttonClass}
        >
          <Trash2 size={14} /> {isDeleting ? t.quiz.deleting : t.quiz.delete}
        </Button>
      )}
    </div>
  )
}
