'use client'

import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

interface LanguageToggleProps {
  compact?: boolean
  className?: string
}

export default function LanguageToggle({ compact = false, className = '' }: LanguageToggleProps) {
  const { locale, setLocale, t } = useAppLocale()

  return (
    <div
      className={`flex shrink-0 items-center rounded-lg border border-border p-0.5 text-xs font-bold ${className}`}
      role="group"
      aria-label={t.common.language}
      title={t.common.language}
    >
      {(['en', 'fr'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          className={`rounded-md px-2 py-1.5 uppercase transition-colors ${
            locale === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={locale === option}
        >
          {compact ? option : option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
