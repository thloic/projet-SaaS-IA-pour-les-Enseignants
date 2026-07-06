'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('educassist-theme')
    const restoredTheme: Theme =
      savedTheme === 'light' || savedTheme === 'dark'
        ? savedTheme
        : document.documentElement.classList.contains('dark')
          ? 'dark'
          : 'light'

    // The inline bootstrap script has already updated <html>; sync React after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(restoredTheme)
    document.documentElement.classList.toggle('dark', restoredTheme === 'dark')
  }, [])

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme)
    window.localStorage.setItem('educassist-theme', nextTheme)
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme doit être utilisé dans ThemeProvider')
  return context
}
