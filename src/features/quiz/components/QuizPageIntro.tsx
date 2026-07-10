'use client'

import { ClipboardList } from 'lucide-react'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

const BRAND = '#534AB7'

export default function QuizPageIntro() {
  const { t } = useAppLocale()

  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
        style={{ backgroundColor: `${BRAND}20` }}
      >
        <ClipboardList size={20} style={{ color: BRAND }} />
      </div>
      <div className="min-w-0">
        <h1 className="text-xl font-black sm:text-2xl">{t.quiz.title}</h1>
        <p className="text-sm text-muted-foreground">{t.quiz.description}</p>
      </div>
    </div>
  )
}
