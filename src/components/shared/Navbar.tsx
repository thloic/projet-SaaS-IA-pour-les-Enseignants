'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, Menu, Settings, LogOut, User, Sun, Moon } from 'lucide-react'
import { mockTeacher } from '@/components/shared/Sidebar'

const BRAND = '#534AB7'

interface NavbarProps {
  onMenuToggle?: () => void
  isDark?: boolean
  onThemeToggle?: () => void
}

export default function Navbar({ onMenuToggle, isDark = true, onThemeToggle }: NavbarProps) {
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 lg:px-6 h-16">
        {/* Hamburger — mobile only */}
        <button
          className="lg:hidden rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground"
          onClick={onMenuToggle}
          aria-label="Menu"
        >
          <Menu size={18} />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-sm hidden sm:block">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className="w-full rounded-xl bg-muted/40 border border-border pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Rechercher dans l'historique..."
          />
        </div>

        <div className="flex-1 sm:hidden" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={onThemeToggle}
            className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground transition-colors"
            title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Bell size={16} />
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40"
            >
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: BRAND }}
              >
                {mockTeacher.initials}
              </div>
              <span className="hidden md:block">{mockTeacher.name.split(' ')[0]}</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">{mockTeacher.name}</p>
                  <p className="text-xs text-muted-foreground">{mockTeacher.subject}</p>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/settings') }}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <User size={15} /> Mon profil
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/settings') }}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <Settings size={15} /> Paramètres
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); router.push('/login') }}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={15} /> Se déconnecter
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

