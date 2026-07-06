'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/shared/ThemeProvider'

interface ThemeToggleProps {
  className?: string
  lightLabel?: string
  darkLabel?: string
}

export default function ThemeToggle({
  className = '',
  lightLabel = 'Passer en mode clair',
  darkLabel = 'Passer en mode sombre',
}: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:text-foreground ${className}`}
      title={isDark ? lightLabel : darkLabel}
      aria-label={isDark ? lightLabel : darkLabel}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
