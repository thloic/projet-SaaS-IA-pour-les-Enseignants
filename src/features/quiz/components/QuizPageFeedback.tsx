'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/shared/ToastProvider'

interface QuizPageFeedbackProps {
  deleted?: boolean
}

export default function QuizPageFeedback({ deleted = false }: QuizPageFeedbackProps) {
  const { showToast } = useToast()

  useEffect(() => {
    if (deleted) showToast('QCM supprimé avec succès.', 'success')
  }, [deleted, showToast])

  return null
}
