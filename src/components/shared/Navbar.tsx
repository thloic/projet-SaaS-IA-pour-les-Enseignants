'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, Menu, Settings, LogOut, User, Sun, Moon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/ToastProvider'
import { useConfirm } from '@/components/shared/ConfirmProvider'
import LanguageToggle from '@/features/i18n/LanguageToggle'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { TeacherIdentity } from '@/features/profile/types/profile.types'

const BRAND = '#534AB7'

interface NavbarProps {
  onMenuToggle?: () => void
  isDark?: boolean
  onThemeToggle?: () => void
  teacher: TeacherIdentity | null
}

export default function Navbar({ onMenuToggle, isDark = true, onThemeToggle, teacher }: NavbarProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const { t } = useAppLocale()
  const [profileOpen, setProfileOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  async function handleSignOut() {
    setProfileOpen(false)
    const accepted = await confirm({
      title: t.common.signOutTitle,
      message: t.common.signOutMessage,
      confirmLabel: t.common.signOut,
      cancelLabel: t.common.stayConnected,
    })
    if (!accepted) return

    setIsSigningOut(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      showToast(t.common.signedOut, 'success')
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('[auth] échec de la déconnexion', error)
      showToast(t.common.signOutError, 'error')
    } finally {
      setIsSigningOut(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full max-w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex h-16 min-w-0 items-center gap-1.5 px-2 sm:gap-2 sm:px-4 lg:px-6">
        {/* Hamburger — mobile only */}
        <button
          className="shrink-0 rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground lg:hidden"
          onClick={onMenuToggle}
          aria-label="Menu"
        >
          <Menu size={18} />
        </button>

        {/* Search */}
        <div className="relative hidden min-w-0 flex-1 max-w-sm md:block">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className="w-full rounded-xl bg-muted/40 border border-border pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={t.common.searchHistory}
          />
        </div>

        <div className="min-w-0 flex-1 md:hidden" />

        {/* Right actions */}
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          {/* Theme toggle */}
          <button
            onClick={onThemeToggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground"
            title={isDark ? t.common.lightMode : t.common.darkMode}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground min-[420px]:flex">
            <Bell size={16} />
          </button>
          <LanguageToggle compact className="max-[340px]:hidden" />

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex h-9 min-w-0 items-center gap-1.5 rounded-xl border border-border px-2 text-sm font-medium transition-colors hover:bg-muted/40 sm:gap-2 sm:px-3"
            >
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: BRAND }}
              >
                {teacher?.initials ?? '?'}
              </div>
              <span className="hidden md:block">{teacher?.name.split(' ')[0] ?? t.common.welcome}</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 z-50 mt-2 w-[min(13rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">{teacher?.name ?? t.common.welcome}</p>
                  <p className="text-xs text-muted-foreground">{teacher?.subject ?? t.common.incompleteProfile}</p>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/settings') }}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <User size={15} /> {t.common.profile}
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/settings') }}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <Settings size={15} /> {t.common.settings}
                  </button>
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-60"
                  >
                    <LogOut size={15} /> {isSigningOut ? t.common.signingOut : t.common.signOut}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
