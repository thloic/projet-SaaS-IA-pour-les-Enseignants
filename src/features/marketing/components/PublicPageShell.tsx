'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { PublicLocale } from '@/features/marketing/hooks/usePublicLocale'
import BrandLogo from '@/components/shared/BrandLogo'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { useTheme } from '@/components/shared/ThemeProvider'

interface PublicPageShellProps {
  locale: PublicLocale
  onLocaleChange: (locale: PublicLocale) => void
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}

export default function PublicPageShell({
  locale,
  onLocaleChange,
  eyebrow,
  title,
  description,
  children,
}: PublicPageShellProps) {
  const { isDark } = useTheme()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F3FF] text-gray-950 transition-colors duration-300 dark:bg-[#080711] dark:text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            isDark
              ? 'linear-gradient(rgba(127,119,221,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(127,119,221,0.07) 1px, transparent 1px)'
              : 'linear-gradient(rgba(83,74,183,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(83,74,183,0.09) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-[#534AB7]/20 blur-[150px]" />

      <header className="relative z-10 border-b border-[#534AB7]/15 bg-[#F5F3FF]/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#080711]/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center">
            <BrandLogo className="h-11 w-11" priority />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex rounded-lg border border-[#534AB7]/20 p-0.5 text-xs font-bold dark:border-white/15">
              {(['en', 'fr'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onLocaleChange(option)}
                  className={`rounded-md px-2 py-1.5 uppercase transition-colors ${
                    locale === option
                      ? 'bg-[#534AB7] text-white'
                      : 'text-gray-500 hover:text-gray-950 dark:text-white/50 dark:hover:text-white'
                  }`}
                  aria-pressed={locale === option}
                >
                  {option}
                </button>
              ))}
            </div>
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-950 dark:text-white/55 dark:hover:text-white sm:flex"
            >
              <ArrowLeft size={15} /> {locale === 'en' ? 'Home' : 'Accueil'}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-xs font-bold tracking-[0.24em] text-[#C8A032]">{eyebrow}</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 dark:text-white/55 sm:text-lg">{description}</p>
        </div>
        {children}
      </main>

      <footer className="relative z-10 border-t border-[#534AB7]/15 px-5 py-7 text-center text-xs text-gray-500 dark:border-white/10 dark:text-white/35">
        © 2026 EducAssist. {locale === 'en' ? 'All rights reserved.' : 'Tous droits réservés.'}
      </footer>
    </div>
  )
}
