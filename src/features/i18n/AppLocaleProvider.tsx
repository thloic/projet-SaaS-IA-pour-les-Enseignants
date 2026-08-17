'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import {
  appTranslations,
} from '@/features/i18n/appTranslations'
import {
  DEFAULT_APP_LOCALE,
  isAppLocale,
  normalizeAppLocale,
  type AppLocale,
} from '@/features/i18n/locale'

interface AppLocaleContextValue {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (typeof appTranslations)[AppLocale]
}

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null)

export function AppLocaleProvider({
  initialLocale = DEFAULT_APP_LOCALE,
  restoreStoredLocale = true,
  children,
}: {
  initialLocale?: AppLocale | null
  restoreStoredLocale?: boolean
  children: React.ReactNode
}) {
  // Le premier rendu est toujours identique sur le serveur et dans le navigateur.
  // La préférence locale publique n'est restaurée qu'après l'hydratation.
  const [locale, setLocaleState] = useState<AppLocale>(() => normalizeAppLocale(initialLocale))

  useEffect(() => {
    if (!restoreStoredLocale) return
    const savedLocale = window.localStorage.getItem('educassist-locale')
    if (isAppLocale(savedLocale) && savedLocale !== locale) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(savedLocale)
    }
  }, [locale, restoreStoredLocale])

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

  return (
    <NextIntlClientProvider locale={locale} messages={{}}>
      <AppLocaleContext.Provider value={value}>{children}</AppLocaleContext.Provider>
    </NextIntlClientProvider>
  )
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
