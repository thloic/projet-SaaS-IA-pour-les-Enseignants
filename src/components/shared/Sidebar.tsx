'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FileText,
  BookOpen,
  ClipboardList,
  MessageSquare,
  UsersRound,
  History,
  ChevronLeft,
  ChevronRight,
  Settings,
  Crown,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import BrandLogo from '@/components/shared/BrandLogo'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { TeacherIdentity } from '@/features/profile/types/profile.types'

const BRAND = '#534AB7'

function progressColor(used: number, limit: number) {
  if (used >= limit) return 'bg-red-500'
  if (used >= limit - 1) return 'bg-amber-400'
  return 'bg-emerald-400'
}

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onMobileClose: () => void
  onToggle: () => void
  teacher: TeacherIdentity | null
}

export default function Sidebar({ collapsed, mobileOpen, onMobileClose, onToggle, teacher }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useAppLocale()
  const generationsUsed = teacher?.generationsUsed ?? 0
  const generationsLimit = teacher?.generationsLimit ?? 3
  const progress = (generationsUsed / generationsLimit) * 100
  const navItems = [
    { label: t.nav.dashboard, href: '/dashboard', icon: Home },
    { label: t.nav.documents, href: '/documents', icon: FileText },
    { label: t.nav.generate, href: '/generate', icon: BookOpen, isNew: true },
    { label: t.nav.classroom, href: '/classroom', icon: UsersRound },
    { label: t.nav.quiz, href: '/quiz', icon: ClipboardList },
    { label: t.nav.bulletin, href: '/bulletin', icon: MessageSquare },
    { label: t.nav.history, href: '/history', icon: History },
    { label: t.nav.settings, href: '/settings', icon: Settings },
  ]

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card/60 backdrop-blur-sm transition-all duration-300 lg:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo row */}
        <div className="flex h-16 items-center justify-between px-3">
          <div
            className={`flex items-center gap-2 overflow-hidden transition-all ${
              collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
            }`}
          >
            <BrandLogo className="h-10 w-32" priority />
          </div>
          {collapsed && (
            <BrandLogo variant="mark" className="mx-auto h-9 w-9" priority />
          )}
          <button
            onClick={onToggle}
            className="shrink-0 rounded-lg border border-border p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={collapsed ? t.common.expandSidebar : t.common.collapseSidebar}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Avatar */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <div className="rounded-2xl bg-muted/40 border border-border px-3 py-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: BRAND }}
                >
                  {teacher?.initials ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{teacher?.name ?? 'Bienvenue'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {teacher ? `${teacher.subject} · ${teacher.level}` : t.common.incompleteProfile}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, href, icon: Icon, isNew }) => {
            const active = pathname === href
            return (
              <Link
                key={label}
                href={href}
                title={collapsed ? label : undefined}
            className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                    {isNew && (
                      <Badge
                        className="text-[10px] px-1.5"
                        style={{ backgroundColor: BRAND, color: 'white' }}
                      >
                        {t.common.new}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Plan Free */}
        {!collapsed && (
          <div className="px-3 pb-4">
            <div className="rounded-2xl border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Crown size={13} className="text-amber-400" />
                {t.common.freePlan}
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>
                    {generationsUsed}/{generationsLimit} {t.common.generations}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className={`h-1.5 rounded-full transition-all ${progressColor(
                      generationsUsed,
                      generationsLimit
                    )}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <Button
                className="w-full text-white text-xs h-8"
                style={{ backgroundColor: BRAND }}
              >
                {t.common.upgrade}
              </Button>
            </div>
          </div>
        )}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
            aria-label={t.common.closeMenu}
          />
          <aside className="relative z-10 flex h-full w-72 max-w-[min(85vw,20rem)] flex-col border-r border-border bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <BrandLogo className="h-10 w-32" priority />
              </div>
              <button
                onClick={onMobileClose}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
                aria-label={t.common.closeMenu}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-3 pb-3">
              <div className="rounded-2xl bg-muted/40 border border-border px-3 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    {teacher?.initials ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{teacher?.name ?? 'Bienvenue'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {teacher ? `${teacher.subject} · ${teacher.level}` : t.common.incompleteProfile}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
              {navItems.map(({ label, href, icon: Icon, isNew }) => {
                const active = pathname === href
                return (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => {
                      onMobileClose()
                    }}
                    className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                    {isNew && (
                      <Badge
                        className="text-[10px] px-1.5"
                        style={{ backgroundColor: BRAND, color: 'white' }}
                      >
                        {t.common.new}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-md lg:hidden">
        <div className="flex gap-1 overflow-x-auto px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {navItems.slice(0, 6).map(({ label, href, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={label}
                href={href}
                className={`flex min-w-16 flex-1 shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon size={18} />
                <span className="truncate w-full text-center">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
