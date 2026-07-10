'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  appTranslations,
  DEFAULT_APP_LOCALE,
  type AppLocale,
} from '@/features/i18n/appTranslations'

interface AppLocaleContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (typeof appTranslations)[AppLocale]
}

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null)

function normalizeLocale(value: unknown): AppLocale {
  return value === 'fr' || value === 'en' ? value : DEFAULT_APP_LOCALE
}

function readInitialLocale(initialLocale: AppLocale | null | undefined): AppLocale {
  if (typeof window === 'undefined') return normalizeLocale(initialLocale)

  const savedLocale = window.localStorage.getItem('educassist-locale')
  return savedLocale === 'fr' || savedLocale === 'en'
    ? savedLocale
    : normalizeLocale(initialLocale)
}

export function AppLocaleProvider({
  initialLocale = DEFAULT_APP_LOCALE,
  children,
}: {
  initialLocale?: AppLocale | null
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<AppLocale>(() => readInitialLocale(initialLocale))

  useEffect(() => {
    window.localStorage.setItem('educassist-locale', locale)
    document.documentElement.lang = locale
  }, [locale])

  function setLocale(nextLocale: AppLocale) {
    setLocaleState(nextLocale)
    window.localStorage.setItem('educassist-locale', nextLocale)
    document.documentElement.lang = nextLocale
  }

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: appTranslations[locale],
    }),
    [locale]
  )

  return <AppLocaleContext.Provider value={value}>{children}</AppLocaleContext.Provider>
}

export function useAppLocale() {
  const context = useContext(AppLocaleContext)
  if (!context) {
    return {
      locale: DEFAULT_APP_LOCALE,
      setLocale: () => undefined,
      t: appTranslations[DEFAULT_APP_LOCALE],
    }
  }

  return context
}
