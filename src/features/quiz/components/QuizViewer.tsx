'use client'

import { startTransition, useActionState, useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, ClipboardList, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/shared/ToastProvider'
import { useConfirm } from '@/components/shared/ConfirmProvider'
import {
  deleteQuizAction,
  updateQuizAction,
  type DeleteQuizState,
  type UpdateQuizState,
} from '@/features/quiz/server/quiz.actions'
import { exportQuizPdf, gradingLabel, questionLabel } from '@/features/quiz/utils/exportQuizPdf'
import type { QuizQuestion, QuizRecord } from '@/features/quiz/types/quiz.types'

const BRAND = '#534AB7'
const initialState: UpdateQuizState = { error: null, success: false }
const initialDeleteState: DeleteQuizState = { error: null }

interface QuizViewerProps {
  quiz: QuizRecord
  teacherName: string
}

export default function QuizViewer({ quiz, teacherName }: QuizViewerProps) {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [title, setTitle] = useState(quiz.title)
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz.questions)
  const [state, formAction, isPending] = useActionState(updateQuizAction, initialState)
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteQuizAction, initialDeleteState)
  const totalPoints = useMemo(
    () => questions.reduce((sum, question) => sum + Number(question.points || 0), 0),
    [questions]
  )

  useEffect(() => {
    if (state.error) showToast(state.error, 'error')
    if (state.success) showToast('QCM renommé avec succès.', 'success')
  }, [showToast, state.error, state.success])

  useEffect(() => {
    if (deleteState.error) showToast(deleteState.error, 'error')
  }, [deleteState.error, showToast])

  function updateQuestion(index: number, patch: Partial<QuizQuestion>) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      )
    )
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question
        const options = question.options.map((option, currentOptionIndex) =>
          currentOptionIndex === optionIndex ? value : option
        )
        const correctAnswer =
          question.correctAnswer === question.options[optionIndex] ? value : question.correctAnswer
        return { ...question, options, correctAnswer }
      })
    )
  }

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

  function handleExportPdf() {
    const didStartExport = exportQuizPdf({
      title,
      teacherName,
      subject: quiz.subject,
      generatedAt: quiz.created_at,
      gradingSystem: quiz.grading_system,
      questions,
      totalPoints,
      onBlockedPopup: () =>
        showToast('Impossible d’ouvrir la fenêtre d’export. Autorisez les popups puis réessayez.', 'error'),
    })
    if (didStartExport) {
      showToast('Export PDF lancé. Choisissez “Enregistrer en PDF” dans la fenêtre d’impression.', 'success')
    }
  }

  return (
    <form action={formAction} className="mx-auto w-full max-w-3xl space-y-5 px-1 pb-20 sm:space-y-6 sm:px-0 lg:pb-6">
      <input type="hidden" name="quizId" value={quiz.id} />
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
            style={{ backgroundColor: `${BRAND}20` }}
          >
            <ClipboardList size={20} style={{ color: BRAND }} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="quizTitle" className="text-xs font-semibold uppercase text-muted-foreground">
              Renommer le QCM
            </Label>
            <Input
              id="quizTitle"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-auto min-w-0 border-0 bg-transparent px-0 text-xl font-black shadow-none focus-visible:ring-0 sm:text-2xl"
            />
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{questions.length} questions</Badge>
              <Badge variant="outline">{quiz.subject}</Badge>
              <Badge variant="outline">{gradingLabel(quiz.grading_system, totalPoints)}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 lg:flex lg:shrink-0 lg:flex-wrap lg:justify-end">
          <Button type="submit" disabled={isPending} className="min-h-9 whitespace-normal text-white" style={{ backgroundColor: BRAND }}>
            {isPending ? (
              'Enregistrement…'
            ) : (
              <>
                <Save size={15} /> Enregistrer
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={handleExportPdf} className="min-h-9 whitespace-normal">
            <BookOpen size={15} /> Exporter PDF
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDeleteClick} className="min-h-9 whitespace-normal">
            <Trash2 size={15} /> {isDeleting ? 'Suppression…' : 'Supprimer'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <div key={question.id} className="space-y-4 rounded-xl border border-border bg-card/40 p-3 sm:rounded-2xl sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Question {index + 1}</Badge>
                <Badge className="bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                  {questionLabel(question.type)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`${question.id}-points`} className="text-xs text-muted-foreground">
                  Points
                </Label>
                <Input
                  id={`${question.id}-points`}
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={question.points}
                  onChange={(event) =>
                    updateQuestion(index, { points: Number(event.target.value) || question.points })
                  }
                  className="h-8 w-24 bg-muted/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${question.id}-prompt`}>Énoncé</Label>
              <textarea
                id={`${question.id}-prompt`}
                value={question.prompt}
                onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                className="min-h-24 w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 sm:min-h-20"
              />
            </div>

            {question.options.length > 0 && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <label
                      key={`${question.id}-${optionIndex}`}
                      className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2"
                    >
                      <input
                        type="radio"
                        checked={question.correctAnswer === option}
                        onChange={() => updateQuestion(index, { correctAnswer: option })}
                        className="size-4"
                      />
                      <Input
                        value={option}
                        onChange={(event) => updateOption(index, optionIndex, event.target.value)}
                        className="h-8 min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {question.options.length === 0 && (
              <div className="space-y-2">
                <Label htmlFor={`${question.id}-answer`}>Réponse attendue</Label>
                <textarea
                  id={`${question.id}-answer`}
                  value={question.correctAnswer}
                  onChange={(event) => updateQuestion(index, { correctAnswer: event.target.value })}
                  className="min-h-24 w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 sm:min-h-20"
                />
              </div>
            )}

            {question.type === 'open' && (
              <div className="space-y-2">
                <Label htmlFor={`${question.id}-guide`}>Guide de correction</Label>
                <textarea
                  id={`${question.id}-guide`}
                  value={question.correctionGuide ?? ''}
                  onChange={(event) => updateQuestion(index, { correctionGuide: event.target.value })}
                  className="min-h-28 w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 sm:min-h-24"
                />
              </div>
            )}

            {question.options.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <Check size={14} />
                Bonne réponse : {question.correctAnswer}
              </div>
            )}
          </div>
        ))}
      </div>
    </form>
  )
}
