'use client'

import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

export default function QuizListHeading({ count }: { count: number }) {
  const { t } = useAppLocale()

  return (
    <h2 className="text-sm font-semibold text-muted-foreground">
      {count === 0
        ? t.quiz.noQuiz
        : `${count} ${count > 1 ? t.quiz.recentQuizzes : t.quiz.recentQuiz}`}
    </h2>
  )
}
