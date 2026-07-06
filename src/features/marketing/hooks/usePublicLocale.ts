'use client'

import { useEffect, useRef, useState } from 'react'

export type PublicLocale = 'en' | 'fr'

export function usePublicLocale() {
  const [locale, setLocale] = useState<PublicLocale>('en')
  const localeReadyRef = useRef(false)

  useEffect(() => {
    if (!localeReadyRef.current) {
      localeReadyRef.current = true
      const savedLocale = window.localStorage.getItem('educassist-locale')
      if (savedLocale === 'en' || savedLocale === 'fr') {
        // Hydration stays stable in English, then restores the visitor's choice.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocale(savedLocale)
        document.documentElement.lang = savedLocale
        return
      }
    }

    window.localStorage.setItem('educassist-locale', locale)
    document.documentElement.lang = locale
  }, [locale])

  return { locale, setLocale }
}
