'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import { APP_LOCALES } from '@/features/i18n/locale'
import { updateInterfaceLanguageAction } from '@/features/profile/server/profile.actions'

interface LanguageToggleProps {
  compact?: boolean
  className?: string
}

export default function LanguageToggle({ compact = false, className = '' }: LanguageToggleProps) {
  const { locale, setLocale, t } = useAppLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function changeLocale(nextLocale: typeof locale) {
    const previousLocale = locale
    setLocale(nextLocale)
    startTransition(async () => {
      const result = await updateInterfaceLanguageAction(nextLocale)
      if (result.error) {
        setLocale(previousLocale)
        return
      }
      // Rafraichit immediatement les composants serveur de la page courante
      // (ex. le tutoriel, qui lit la langue depuis le profil) plutot que
      // d'attendre la prochaine navigation.
      router.refresh()
    })
  }

  return (
    <div
      className={`flex shrink-0 items-center rounded-lg border border-border p-0.5 text-xs font-bold ${className}`}
      role="group"
      aria-label={t.common.language}
      title={t.common.language}
    >
      {APP_LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => changeLocale(option)}
          disabled={isPending}
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
