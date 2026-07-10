'use client'

import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

interface QuizButtonProps {
  sourceDocumentId: string
}

export default function QuizButton({ sourceDocumentId }: QuizButtonProps) {
  const { t } = useAppLocale()

  return (
    <Link
      href={`/quiz?sourceDocumentId=${sourceDocumentId}`}
      className="flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:w-fit sm:justify-start"
    >
      <ClipboardList size={14} /> {t.dashboard.quickActions.quizCta} {t.quiz.quiz.toLowerCase()}
    </Link>
  )
}
