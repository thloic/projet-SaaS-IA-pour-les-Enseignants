'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  Brain,
  Home,
  BookOpen,
  ClipboardList,
  MessageSquare,
  History,
  ChevronLeft,
  ChevronRight,
  Settings,
  Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const BRAND = '#534AB7'

export const mockTeacher = {
  name: 'Marie Dupont',
  initials: 'MD',
  subject: 'Mathématiques',
  level: '3ème',
  country: 'France',
  plan: 'free' as const,
  generationsUsed: 2,
  generationsLimit: 3,
}

const navItems = [
  { label: 'Accueil', href: '/dashboard', icon: Home },
  { label: 'Nouveau cours', href: '/generate', icon: BookOpen, isNew: true },
  { label: 'Quiz & QCM', href: '/quiz', icon: ClipboardList },
  { label: 'Bulletins', href: '/bulletin', icon: MessageSquare },
  { label: 'Historique', href: '/history', icon: History },
  { label: 'Paramètres', href: '/settings', icon: Settings },
]

function progressColor(used: number, limit: number) {
  if (used >= limit) return 'bg-red-500'
  if (used >= limit - 1) return 'bg-amber-400'
  return 'bg-emerald-400'
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const progress = (mockTeacher.generationsUsed / mockTeacher.generationsLimit) * 100

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-border bg-card/60 backdrop-blur-sm transition-all duration-300 ${
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
            <div className="rounded-lg p-1.5 shrink-0" style={{ backgroundColor: BRAND }}>
              <Brain className="text-white" size={18} />
            </div>
            <span className="font-black text-base whitespace-nowrap">EducAssist</span>
          </div>
          {collapsed && (
            <div className="mx-auto rounded-lg p-1.5 shrink-0" style={{ backgroundColor: BRAND }}>
              <Brain className="text-white" size={18} />
            </div>
          )}
          <button
            onClick={onToggle}
            className="shrink-0 rounded-lg border border-border p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={collapsed ? 'Agrandir la sidebar' : 'Réduire la sidebar'}
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
                  {mockTeacher.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{mockTeacher.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {mockTeacher.subject} · {mockTeacher.level}
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
              <button
                key={label}
                onClick={() => router.push(href)}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{label}</span>
                    {isNew && (
                      <Badge
                        className="text-[10px] px-1.5"
                        style={{ backgroundColor: BRAND, color: 'white' }}
                      >
                        Nouveau
                      </Badge>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* Plan Free */}
        {!collapsed && (
          <div className="px-3 pb-4">
            <div className="rounded-2xl border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Crown size={13} className="text-amber-400" />
                Plan Free
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>
                    {mockTeacher.generationsUsed}/{mockTeacher.generationsLimit} générations
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className={`h-1.5 rounded-full transition-all ${progressColor(
                      mockTeacher.generationsUsed,
                      mockTeacher.generationsLimit
                    )}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <Button
                className="w-full text-white text-xs h-8"
                style={{ backgroundColor: BRAND }}
              >
                Passer au Pro
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-md">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {navItems.slice(0, 5).map(({ label, href, icon: Icon }) => {
            const active = pathname === href
            return (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xs transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon size={18} />
                <span className="truncate w-full text-center">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
