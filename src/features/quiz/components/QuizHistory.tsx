'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, History, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import QuizActions from '@/features/quiz/components/QuizActions'
import type { QuizListItem } from '@/features/quiz/types/quiz.types'

const BRAND = '#534AB7'

interface QuizHistoryProps {
  quizzes: QuizListItem[]
  teacherName: string
  deleted?: boolean
}

export default function QuizHistory({ quizzes, teacherName, deleted = false }: QuizHistoryProps) {
  const { showToast } = useToast()
  const { locale, t } = useAppLocale()
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('Tous')
  const subjects = useMemo(
    () => ['Tous', ...Array.from(new Set(quizzes.map((quiz) => quiz.subject))).sort()],
    [quizzes]
  )

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return quizzes.filter((quiz) => {
      const matchSearch =
        !normalizedSearch ||
        quiz.title.toLowerCase().includes(normalizedSearch) ||
        quiz.subject.toLowerCase().includes(normalizedSearch)
      const matchSubject = subjectFilter === 'Tous' || quiz.subject === subjectFilter
      return matchSearch && matchSubject
    })
  }, [quizzes, search, subjectFilter])

  useEffect(() => {
    if (deleted) showToast(t.quiz.deleted, 'success')
  }, [deleted, showToast, t])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-20 lg:pb-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/40">
          <History size={22} className="text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-black">{t.history.title}</h1>
          <p className="text-sm text-muted-foreground">
            {quizzes.length} {quizzes.length > 1 ? t.history.generatedQuizzes : t.history.generatedQuiz}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.history.searchPlaceholder}
            className="bg-muted/40 pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs outline-none sm:w-auto"
          value={subjectFilter}
          onChange={(event) => setSubjectFilter(event.target.value)}
        >
          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-muted/20 py-16 text-center text-sm text-muted-foreground">
          {t.history.noResult}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          {filtered.map((quiz, index) => (
            <div
              key={quiz.id}
              className={`flex min-w-0 flex-col gap-3 px-3 py-3.5 transition-colors hover:bg-muted/20 sm:px-4 lg:flex-row lg:items-center ${
                index !== filtered.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${BRAND}20` }}
                >
                  <ClipboardList size={16} style={{ color: BRAND }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium sm:truncate">{quiz.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(quiz.created_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                    </span>
                    <Badge className="border bg-teal-500/15 text-[10px] text-teal-700 border-teal-500/30 dark:bg-teal-500/20 dark:text-teal-300">
                      {t.quiz.quiz}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {quiz.subject}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {quiz.question_count} {t.quiz.questions}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {quiz.total_points} {t.quiz.points}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-auto lg:shrink-0">
                <QuizActions quiz={quiz} teacherName={teacherName} redirectTo="/history" compact />
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {filtered.length} {filtered.length > 1 ? t.history.results : t.history.result}
        </p>
      )}
    </div>
  )
}
