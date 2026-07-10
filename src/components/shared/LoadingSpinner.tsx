'use client'

import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

interface LoadingSpinnerProps {
  label?: string
}

export default function LoadingSpinner({ label }: LoadingSpinnerProps) {
  const { t } = useAppLocale()

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <span>{label ?? t.common.loading}</span>
    </div>
  )
}
