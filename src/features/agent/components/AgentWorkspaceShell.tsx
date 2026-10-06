'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  BookOpenCheck,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Database,
  FileHeart,
  History,
  Languages,
  KeyRound,
  Menu,
  MessageSquareText,
  NotebookPen,
  Plus,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { agentWorkspaceTranslations, type AgentWorkspaceAction } from '@/features/agent/i18n/agentWorkspaceTranslations'
import type { AppLocale } from '@/features/i18n/locale'

const ACTION_ICONS: Record<AgentWorkspaceAction, LucideIcon> = {
  student: UsersRound,
  pat: FileHeart,
  bulletin: ClipboardList,
  results: BarChart3,
  observation: NotebookPen,
  content: BookOpenCheck,
}

interface AgentWorkspaceShellProps {
  locale: AppLocale
  aiSource: 'included' | 'personal'
  hasMessages: boolean
  busy: boolean
  error: string | null
  onNewConversation: () => void
  onQuickAction: (prompt: string) => void
  children: ReactNode
  composer: ReactNode
}

type MobilePanel = 'navigation' | 'context' | null

export default function AgentWorkspaceShell({
  locale,
  aiSource,
  hasMessages,
  busy,
  error,
  onNewConversation,
  onQuickAction,
  children,
  composer,
}: AgentWorkspaceShellProps) {
  const copy = agentWorkspaceTranslations[locale]
  const aiSourceLabel = aiSource === 'personal'
    ? locale === 'fr' ? 'Clé API personnelle' : locale === 'es' ? 'Clave API personal' : 'Personal API key'
    : locale === 'fr' ? 'IA EducAssist' : locale === 'es' ? 'IA EducAssist' : 'EducAssist AI'
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null)

  const navigation = (
    <>
      <div className="border-b border-border/60 p-4">
        <button
          type="button"
          onClick={onNewConversation}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#534AB7] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#463da5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          {copy.newConversation}
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label={copy.navigation}>
        <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {copy.navigation}
        </p>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl bg-[#534AB7]/10 px-3 py-2.5 text-left text-sm font-semibold text-[#534AB7] dark:text-[#b9b3ff]"
        >
          <MessageSquareText size={17} />
          <span className="flex-1">{copy.currentConversation}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#534AB7]" />
        </button>
        <Link
          href="/classroom"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <UsersRound size={17} />
          <span className="flex-1">{copy.classes}</span>
          <ChevronRight size={14} />
        </Link>
        <Link
          href="/history/documents"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <History size={17} />
          <span className="flex-1">{copy.documents}</span>
          <ChevronRight size={14} />
        </Link>
      </nav>
      <div className="m-3 rounded-2xl border border-[#534AB7]/15 bg-[#534AB7]/5 p-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-[#534AB7] dark:text-[#b9b3ff]">
          <Sparkles size={14} />
          EducAssist
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.humanValidationDescription}</p>
      </div>
    </>
  )

  const context = (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{copy.context}</p>
        <div className="mt-3 rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#534AB7]/10 text-[#534AB7] dark:text-[#b9b3ff]">
            <Database size={17} />
          </div>
          <p className="mt-3 text-sm font-bold">{copy.automaticContext}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{copy.contextDescription}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" size={17} />
          <div>
            <p className="text-xs font-bold">{copy.protectedData}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{copy.protectedDataDescription}</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" size={17} />
          <div>
            <p className="text-xs font-bold">{copy.humanValidation}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{copy.humanValidationDescription}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-7.5rem)] min-h-[520px] max-w-[1600px] overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_20px_70px_-32px_rgba(35,30,86,0.35)] lg:h-[calc(100vh-9rem)]">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border/60 bg-muted/20 xl:flex">
        {navigation}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-background/70">
        <header className="flex h-[74px] shrink-0 items-center justify-between border-b border-border/60 bg-card/90 px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobilePanel('navigation')}
              className="rounded-xl border border-border p-2 text-muted-foreground xl:hidden"
              aria-label={copy.navigation}
            >
              <Menu size={18} />
            </button>
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#534AB7] to-[#756ce0] text-white shadow-md shadow-[#534AB7]/20">
              <Bot size={20} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-[#534AB7] sm:block dark:text-[#b9b3ff]">{copy.eyebrow}</p>
              <h1 className="truncate text-base font-black tracking-tight sm:text-lg">{copy.title}</h1>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:hidden">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {copy.ready}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted lg:flex ${aiSource === 'personal' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300' : 'border-border/70 text-muted-foreground'}`}
              title={aiSourceLabel}
            >
              {aiSource === 'personal' ? <KeyRound size={14} /> : <Bot size={14} />}
              {aiSourceLabel}
            </Link>
            <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {copy.ready}
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium md:flex">
              <Languages size={14} className="text-[#534AB7]" />
              {copy.languageName}
            </div>
            <button
              type="button"
              onClick={() => setMobilePanel('context')}
              className="rounded-xl border border-border p-2 text-muted-foreground 2xl:hidden"
              aria-label={copy.context}
            >
              <Database size={18} />
            </button>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(83,74,183,0.07),transparent_42%)]">
          {!hasMessages ? (
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center px-4 py-8 sm:px-7 lg:py-10">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#534AB7]/15 bg-[#534AB7]/10 text-[#534AB7] dark:text-[#b9b3ff]">
                  <Sparkles size={21} />
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">{copy.welcomeTitle}</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{copy.welcomeDescription}</p>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {copy.actions.map((action) => {
                  const Icon = ACTION_ICONS[action.id]
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => onQuickAction(action.prompt)}
                      className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/90 p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#534AB7]/35 hover:shadow-md"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition group-hover:bg-[#534AB7]/10 group-hover:text-[#534AB7] dark:group-hover:text-[#b9b3ff]">
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{action.title}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{action.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-7">{children}</div>
          )}
        </main>

        <footer className="shrink-0 border-t border-border/60 bg-card/95 px-3 py-3 backdrop-blur sm:px-5 sm:py-4">
          {error && (
            <div className="mb-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
              {error}
            </div>
          )}
          {composer}
          <p className="mt-2 hidden text-center text-[10px] text-muted-foreground sm:block">{copy.writingHint}</p>
        </footer>
      </section>

      <aside className="hidden w-72 shrink-0 border-l border-border/60 bg-muted/20 2xl:block">
        {context}
      </aside>

      {mobilePanel && (
        <div className="absolute inset-0 z-30 flex bg-black/35 backdrop-blur-[2px]" role="presentation" onClick={() => setMobilePanel(null)}>
          <aside
            className={`flex h-full w-[min(86vw,320px)] flex-col bg-card shadow-2xl ${mobilePanel === 'context' ? 'ml-auto' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={mobilePanel === 'context' ? copy.context : copy.navigation}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-[74px] items-center justify-between border-b border-border/60 px-4">
              <p className="text-sm font-bold">{mobilePanel === 'context' ? copy.context : copy.navigation}</p>
              <button type="button" onClick={() => setMobilePanel(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={copy.close}>
                <X size={18} />
              </button>
            </div>
            {mobilePanel === 'context' ? context : navigation}
          </aside>
        </div>
      )}
    </div>
  )
}
