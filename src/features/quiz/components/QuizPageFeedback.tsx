'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

interface QuizPageFeedbackProps {
  deleted?: boolean
}

export default function QuizPageFeedback({ deleted = false }: QuizPageFeedbackProps) {
  const { showToast } = useToast()
  const { t } = useAppLocale()

  useEffect(() => {
    if (deleted) showToast(t.quiz.deleted, 'success')
  }, [deleted, showToast, t])

  return null
}
