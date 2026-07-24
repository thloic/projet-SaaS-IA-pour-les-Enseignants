'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  History,
  MessageSquare,
  Search,
  TrendingUp,
  WandSparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import QuizActions from '@/features/quiz/components/QuizActions'
import type { QuizListItem } from '@/features/quiz/types/quiz.types'

const BRAND = '#534AB7'

const quickActions = [
  {
    titleKey: 'adaptationTitle',
    descriptionKey: 'adaptationDescription',
    icon: WandSparkles,
    href: '/adaptations/new',
    badgeKey: 'ai',
    style: 'emerald',
    ctaKey: 'adaptationCta',
  },
  {
    titleKey: 'courseTitle',
    descriptionKey: 'courseDescription',
    icon: BookOpen,
    href: '/generate',
    badgeKey: 'ai',
    style: 'violet',
    ctaKey: 'courseCta',
  },
  {
    titleKey: 'quizTitle',
    descriptionKey: 'quizDescription',
    icon: ClipboardList,
    href: '/quiz',
    badgeKey: 'auto',
    style: 'teal',
    ctaKey: 'quizCta',
  },
  {
    titleKey: 'bulletinTitle',
    descriptionKey: 'bulletinDescription',
    icon: MessageSquare,
    href: '/bulletin',
    badgeKey: 'fast',
    style: 'amber',
    ctaKey: 'bulletinCta',
  },
] as const

interface DashboardContentProps {
  firstName: string
  teacherName: string
  recentQuizzes: QuizListItem[]
  showWelcome?: boolean
  showDeletedFeedback?: boolean
}

export default function DashboardContent({
  firstName,
  teacherName,
  recentQuizzes,
  showWelcome = false,
  showDeletedFeedback = false,
}: DashboardContentProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { locale, t } = useAppLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const formattedDate = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }, [locale])
  const stats = useMemo(
    () => [
      {
        label: t.dashboard.stats.lessons,
        value: '12',
        icon: TrendingUp,
        color: 'text-emerald-600 dark:text-emerald-400',
      },
      {
        label: t.dashboard.stats.quizzes,
        value: String(recentQuizzes.length),
        icon: ClipboardCheck,
        color: 'text-sky-600 dark:text-sky-400',
      },
      {
        label: t.dashboard.stats.reports,
        value: '34',
        icon: FileText,
        color: 'text-amber-600 dark:text-amber-400',
      },
      {
        label: t.dashboard.stats.savedTime,
        value: '6h',
        icon: Clock,
        color: 'text-violet-600 dark:text-violet-400',
      },
    ],
    [recentQuizzes.length, t]
  )

  useEffect(() => {
    if (!showWelcome) return
    showToast(
      `${t.common.welcome}${firstName ? ` ${firstName}` : ''} ! ${t.dashboard.welcomeBack}`,
      'success'
    )
    router.replace('/dashboard', { scroll: false })
  }, [firstName, router, showToast, showWelcome, t])

  useEffect(() => {
    if (!showDeletedFeedback) return
    showToast(t.dashboard.deleted, 'success')
    router.replace('/dashboard', { scroll: false })
  }, [router, showDeletedFeedback, showToast, t])

  useGSAP(
    () => {
      gsap.fromTo(
        '.action-card',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
      )
      gsap.fromTo(
        '.stat-card',
        { opacity: 0 },
        { opacity: 1, duration: 0.5, stagger: 0.15, ease: 'power1.out' }
      )
    },
    { scope: containerRef }
  )

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-7xl space-y-6 pb-20 sm:space-y-8 lg:pb-6">
      {/* Header */}
      <section className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="break-words text-2xl font-black sm:text-3xl">
            {t.dashboard.hello} {firstName || t.dashboard.fallbackName}
          </h1>
          <p className="text-sm text-muted-foreground capitalize sm:text-base">
            {formattedDate} · {t.dashboard.todayPrompt}
          </p>
        </div>
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className="w-full rounded-xl bg-muted/40 border border-border px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={t.dashboard.searchPlaceholder}
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map(({ titleKey, descriptionKey, icon: Icon, href, badgeKey, style, ctaKey }) => (
          <div
            key={titleKey}
            className={`action-card group min-w-0 rounded-2xl border p-4 transition-transform hover:-translate-y-1 sm:p-6 ${
              style === 'violet'
                ? 'bg-violet-50 border-violet-200 dark:bg-[#17142a] dark:border-violet-500/30'
                : style === 'teal'
                ? 'bg-teal-50 border-teal-200 dark:bg-[#0f1a18] dark:border-teal-500/30'
                : style === 'emerald'
                ? 'bg-emerald-50 border-emerald-200 dark:bg-[#101a16] dark:border-emerald-500/30'
                : 'bg-amber-50 border-amber-200 dark:bg-[#1a1408] dark:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                  style === 'violet'
                    ? 'bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                    : style === 'teal'
                    ? 'bg-teal-500/15 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
                    : style === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                }`}
              >
                <Icon size={22} />
              </div>
              <Badge
                className="text-[10px]"
                style={{ backgroundColor: BRAND, color: 'white' }}
              >
                {t.dashboard.badges[badgeKey]}
              </Badge>
            </div>
            <div className="mt-5 space-y-2">
              <h3 className="break-words text-lg font-bold">{t.dashboard.quickActions[titleKey]}</h3>
              <p className="text-sm text-muted-foreground">{t.dashboard.quickActions[descriptionKey]}</p>
            </div>
            <Button asChild className="mt-6 w-full sm:w-auto" style={{ backgroundColor: BRAND, color: 'white' }}>
              <Link href={href}>{t.dashboard.quickActions[ctaKey]}</Link>
            </Button>
          </div>
        ))}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="stat-card flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card/40 p-4"
          >
            <div className={`h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold">{value}</p>
              <p className="break-words text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* History */}
      <section className="rounded-2xl border border-border bg-card/40 p-3 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <History size={18} className="text-muted-foreground" />
            <h2 className="min-w-0 break-words text-lg font-bold">{t.dashboard.recentHistory}</h2>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href="/history">{t.dashboard.viewAll}</Link>
          </Button>
        </div>

        {recentQuizzes.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            {t.dashboard.noQuizzes}
          </div>
        ) : (
          <div className="space-y-3">
            {recentQuizzes.slice(0, 5).map((quiz) => (
              <div
                key={quiz.id}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-3 transition-colors hover:bg-muted/50 sm:px-4 lg:flex-row lg:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold sm:truncate">{quiz.title}</p>
                  <p className="text-xs text-muted-foreground">
                  {quiz.subject} · {quiz.question_count} {t.quiz.questions} · {quiz.total_points} {t.quiz.points}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground lg:shrink-0">
                  <span>{new Date(quiz.created_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}</span>
                  <Badge className="border bg-sky-500/15 text-sky-700 border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-200">
                    Quiz
                  </Badge>
                </div>
                <div className="w-full lg:w-auto lg:shrink-0">
                  <QuizActions
                    quiz={quiz}
                    teacherName={teacherName}
                    redirectTo="/dashboard"
                    compact
                    showPdf={false}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
