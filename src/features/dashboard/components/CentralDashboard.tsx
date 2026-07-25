'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCheck,
  ClipboardList,
  Gauge,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  UsersRound,
  WandSparkles,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import { useToast } from '@/components/shared/ToastProvider'
import DashboardPeriodFilter from '@/features/dashboard/components/DashboardPeriodFilter'
import {
  ActivityTrendChart,
  AttendanceTrendChart,
  ClassEngagementChart,
  DashboardDonutChart,
} from '@/features/dashboard/charts/DashboardCharts'
import UnifiedHistory from '@/features/dashboard/history/UnifiedHistory'
import type {
  CentralDashboardData,
  DashboardAlert,
  DashboardMetric,
} from '@/features/dashboard/types/dashboard.types'

interface CentralDashboardProps {
  data: CentralDashboardData
  showWelcome?: boolean
  showDeletedFeedback?: boolean
}

const METRIC_ICONS = {
  attendance: TrendingUp,
  students: UsersRound,
  attention: AlertCircle,
  corrections: CheckCheck,
  usage: Gauge,
} satisfies Record<DashboardMetric['key'], typeof TrendingUp>

const METRIC_COLORS = {
  attendance: 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-300',
  students: 'text-sky-700 bg-sky-500/10 dark:text-sky-300',
  attention: 'text-amber-700 bg-amber-500/10 dark:text-amber-300',
  corrections: 'text-rose-700 bg-rose-500/10 dark:text-rose-300',
  usage: 'text-violet-700 bg-violet-500/10 dark:text-violet-300',
} satisfies Record<DashboardMetric['key'], string>

const QUICK_ACTIONS = [
  { type: 'course', href: '/generate', icon: BookOpen },
  { type: 'adaptation', href: '/adaptations/new', icon: WandSparkles },
  { type: 'quiz', href: '/quiz', icon: ClipboardList },
  { type: 'correction', href: '/correction/new', icon: CheckCheck },
  { type: 'bulletin', href: '/bulletin', icon: MessageSquare },
  { type: 'classroom', href: '/classroom', icon: UsersRound },
] as const

const COPY = {
  fr: {
    hello: 'Bonjour',
    subtitle: 'Voici les éléments utiles pour piloter votre journée.',
    metrics: {
      attendance: 'Présence',
      students: 'Élèves',
      attention: 'Suivis à vérifier',
      corrections: 'Copies à traiter',
      usage: 'Quota IA',
    },
    quick: {
      course: 'Créer un cours',
      adaptation: 'Adapter une leçon',
      quiz: 'Créer un quiz',
      correction: 'Corriger des copies',
      bulletin: 'Rédiger un bulletin',
      classroom: 'Ouvrir mes classes',
    },
    compared: 'par rapport à la période précédente',
    classes: 'classes',
    sessions: 'séances',
    priority: 'À vérifier maintenant',
    attendanceTrend: 'Évolution des présences',
    attendanceTrendHint: 'Taux réel calculé à partir des appels enregistrés.',
    attendanceSplit: 'Répartition des présences',
    attendanceSplitHint: 'Présents, absents, retards et excusés.',
    activity: 'Activité pédagogique',
    activityHint: 'Contenus et traitements créés sur la période.',
    engagement: 'Engagement par classe',
    engagementHint: 'Participations et observations saisies en séance.',
    observations: 'Observations',
    observationsHint: 'Répartition des faits enregistrés par catégorie.',
    workload: 'État des corrections',
    workloadHint: 'Copies en attente, en cours, terminées ou échouées.',
    history: 'Activité récente',
    allHistory: 'Voir tout l’historique',
    noObservation: 'Aucune observation sur cette période.',
    noAttendance: 'Aucune présence enregistrée sur cette période.',
    noCorrection: 'Aucune correction sur cette période.',
  },
  en: {
    hello: 'Hello',
    subtitle: 'Here are the useful signals for managing your day.',
    metrics: {
      attendance: 'Attendance',
      students: 'Students',
      attention: 'Follow-ups to check',
      corrections: 'Copies to process',
      usage: 'AI quota',
    },
    quick: {
      course: 'Create a lesson',
      adaptation: 'Adapt a lesson',
      quiz: 'Create a quiz',
      correction: 'Grade copies',
      bulletin: 'Write a report',
      classroom: 'Open my classes',
    },
    compared: 'compared with the previous period',
    classes: 'classes',
    sessions: 'sessions',
    priority: 'Check now',
    attendanceTrend: 'Attendance trend',
    attendanceTrendHint: 'Actual rate calculated from recorded attendance.',
    attendanceSplit: 'Attendance breakdown',
    attendanceSplitHint: 'Present, absent, late and excused.',
    activity: 'Teaching activity',
    activityHint: 'Content and processing created during the period.',
    engagement: 'Engagement by class',
    engagementHint: 'Participation and observations recorded in sessions.',
    observations: 'Observations',
    observationsHint: 'Recorded facts by category.',
    workload: 'Grading status',
    workloadHint: 'Copies pending, processing, complete or failed.',
    history: 'Recent activity',
    allHistory: 'View full history',
    noObservation: 'No observations during this period.',
    noAttendance: 'No attendance recorded during this period.',
    noCorrection: 'No grading activity during this period.',
  },
}

export default function CentralDashboard({
  data,
  showWelcome = false,
  showDeletedFeedback = false,
}: CentralDashboardProps) {
  const { locale, t } = useAppLocale()
  const copy = COPY[locale]
  const router = useRouter()
  const { showToast } = useToast()
  const rootRef = useRef<HTMLDivElement>(null)
  const [openAlert, setOpenAlert] = useState<string | null>(null)
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])
  const visibleAlerts = data.alerts.filter((alert) => !dismissedAlerts.includes(alert.id))
  const priorityAlert = visibleAlerts[0] ?? null

  const formattedRange = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: data.period.from.slice(0, 4) !== data.period.to.slice(0, 4) ? 'numeric' : undefined,
    })
    return `${formatter.format(new Date(`${data.period.from}T12:00:00`))} – ${formatter.format(
      new Date(`${data.period.to}T12:00:00`)
    )}`
  }, [data.period.from, data.period.to, locale])

  useEffect(() => {
    if (showWelcome) {
      showToast(
        `${t.common.welcome}${data.teacher.firstName ? ` ${data.teacher.firstName}` : ''} !`,
        'success'
      )
      router.replace('/dashboard', { scroll: false })
    } else if (showDeletedFeedback) {
      showToast(t.dashboard.deleted, 'success')
      router.replace('/dashboard', { scroll: false })
    }
  }, [
    data.teacher.firstName,
    router,
    showDeletedFeedback,
    showToast,
    showWelcome,
    t,
  ])

  useGSAP(
    () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return
      gsap.fromTo(
        '.dashboard-reveal',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.045, ease: 'power2.out' }
      )
      gsap.fromTo(
        '.metric-alert',
        { scale: 1 },
        { scale: 1.12, duration: 0.35, repeat: 3, yoyo: true, ease: 'power1.inOut' }
      )
    },
    { scope: rootRef, dependencies: [data.period.from, data.period.to] }
  )

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-7xl space-y-6 pb-24 lg:pb-8">
      <header className="dashboard-reveal flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-black sm:text-3xl">
            {copy.hello} {data.teacher.firstName || t.dashboard.fallbackName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.subtitle} · {formattedRange}
          </p>
        </div>
        <DashboardPeriodFilter period={data.period} basePath="/dashboard" />
      </header>

      {priorityAlert && (
        <PriorityAlert
          alert={priorityAlert}
          label={copy.priority}
          locale={locale}
          onDismiss={() =>
            setDismissedAlerts((current) => [...current, priorityAlert.id])
          }
        />
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {data.metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            metric={metric}
            label={copy.metrics[metric.key]}
            comparedLabel={copy.compared}
            alert={visibleAlerts.find((item) => item.target === metric.key) ?? null}
            locale={locale}
            open={openAlert === metric.key}
            onToggle={() =>
              setOpenAlert((current) => (current === metric.key ? null : metric.key))
            }
          />
        ))}
      </section>

      <section className="dashboard-reveal flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/40 p-3">
        <span className="mr-1 text-xs font-bold text-muted-foreground">
          {data.classCount} {copy.classes} · {data.sessionCount} {copy.sessions}
        </span>
        {QUICK_ACTIONS.map(({ type, href, icon: Icon }) => {
          const count =
            type === 'course'
              ? data.contentCounts.courses
              : type === 'adaptation'
                ? data.contentCounts.adaptations
                : type === 'quiz'
                  ? data.contentCounts.quizzes
                  : type === 'correction'
                    ? data.contentCounts.corrections
                    : type === 'bulletin'
                      ? data.contentCounts.bulletins
                      : data.classCount
          return (
            <Button key={type} asChild variant="outline" size="sm" className="min-h-9">
              <Link href={href}>
                <Icon size={15} /> {copy.quick[type]}
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {count}
                </Badge>
              </Link>
            </Button>
          )
        })}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(290px,0.55fr)]">
        <ChartPanel
          title={copy.attendanceTrend}
          description={copy.attendanceTrendHint}
          className="dashboard-reveal"
        >
          <AttendanceTrendChart data={data.trend} />
        </ChartPanel>
        <ChartPanel
          title={copy.attendanceSplit}
          description={copy.attendanceSplitHint}
          className="dashboard-reveal"
        >
          <DashboardDonutChart
            data={data.attendanceDistribution}
            emptyMessage={copy.noAttendance}
          />
        </ChartPanel>
      </div>

      <ChartPanel
        title={copy.activity}
        description={copy.activityHint}
        className="dashboard-reveal"
      >
        <ActivityTrendChart data={data.trend} />
      </ChartPanel>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <ChartPanel
          title={copy.engagement}
          description={copy.engagementHint}
          className="dashboard-reveal lg:col-span-2 xl:col-span-1"
        >
          <ClassEngagementChart data={data.classEngagement} />
        </ChartPanel>
        <ChartPanel
          title={copy.observations}
          description={copy.observationsHint}
          className="dashboard-reveal"
        >
          <DashboardDonutChart
            data={data.observationDistribution}
            emptyMessage={copy.noObservation}
          />
        </ChartPanel>
        <ChartPanel
          title={copy.workload}
          description={copy.workloadHint}
          className="dashboard-reveal"
        >
          <DashboardDonutChart
            data={data.correctionWorkload}
            emptyMessage={copy.noCorrection}
          />
        </ChartPanel>
      </div>

      <section className="dashboard-reveal rounded-lg border border-border bg-card/40 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">{copy.history}</h2>
            <p className="text-sm text-muted-foreground">
              {locale === 'fr'
                ? `${data.history.length} élément${data.history.length > 1 ? 's' : ''} sur la période`
                : `${data.history.length} item${data.history.length === 1 ? '' : 's'} in this period`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/history?preset=${data.period.preset}&from=${data.period.from}&to=${data.period.to}`}
            >
              {copy.allHistory} <ArrowRight />
            </Link>
          </Button>
        </div>
        <UnifiedHistory items={data.history} compact />
      </section>
    </div>
  )
}

function MetricCard({
  metric,
  label,
  comparedLabel,
  alert,
  locale,
  open,
  onToggle,
}: {
  metric: DashboardMetric
  label: string
  comparedLabel: string
  alert: DashboardAlert | null
  locale: 'en' | 'fr'
  open: boolean
  onToggle: () => void
}) {
  const Icon = METRIC_ICONS[metric.key]
  const delta =
    metric.value === null || metric.previousValue === null
      ? null
      : metric.value - metric.previousValue
  return (
    <article className="dashboard-reveal relative min-h-28 min-w-0 rounded-lg border border-border bg-card/50 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${METRIC_COLORS[metric.key]}`}>
          <Icon size={17} />
        </span>
        {alert && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={locale === 'fr' ? alert.title : alert.titleEn}
            className={`metric-alert flex h-8 w-8 items-center justify-center rounded-full ${
              alert.severity === 'critical'
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
            }`}
          >
            <AlertCircle size={16} />
          </button>
        )}
      </div>
      <strong className="mt-3 block text-2xl font-black">
        {metric.value === null ? '—' : metric.value}
        {metric.value === null ? '' : metric.suffix}
      </strong>
      <span className="block text-xs text-muted-foreground">{label}</span>
      {delta !== null && (
        <span
          title={comparedLabel}
          className={`mt-1 flex items-center gap-1 text-[10px] font-semibold ${
            delta >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
          }`}
        >
          {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {delta > 0 ? '+' : ''}
          {delta}
        </span>
      )}
      {open && alert && (
        <div className="fixed left-3 right-3 top-24 z-50 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl sm:absolute sm:left-auto sm:right-2 sm:top-11 sm:z-20 sm:w-64">
          <p className="text-xs font-bold">
            {locale === 'fr' ? alert.title : alert.titleEn}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {locale === 'fr' ? alert.message : alert.messageEn}
          </p>
          <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0 text-xs">
            <Link href={alert.href}>
              {locale === 'fr' ? 'Vérifier maintenant' : 'Check now'}
            </Link>
          </Button>
        </div>
      )}
    </article>
  )
}

function PriorityAlert({
  alert,
  label,
  locale,
  onDismiss,
}: {
  alert: DashboardAlert
  label: string
  locale: 'en' | 'fr'
  onDismiss: () => void
}) {
  return (
    <section
      className={`dashboard-reveal flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center ${
        alert.severity === 'critical'
          ? 'border-rose-500/30 bg-rose-500/8'
          : 'border-amber-500/30 bg-amber-500/8'
      }`}
    >
      <AlertCircle
        className={`shrink-0 ${
          alert.severity === 'critical'
            ? 'text-rose-700 dark:text-rose-300'
            : 'text-amber-700 dark:text-amber-300'
        }`}
        size={19}
      />
      <div className="min-w-0 flex-1">
        <Badge variant="outline" className="mb-1 text-[10px]">
          {label}
        </Badge>
        <p className="text-sm font-bold">
          {locale === 'fr' ? alert.title : alert.titleEn}
        </p>
        <p className="text-xs text-muted-foreground">
          {locale === 'fr' ? alert.message : alert.messageEn}
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild size="sm">
          <Link href={alert.href}>{locale === 'fr' ? 'Vérifier' : 'Check'}</Link>
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onDismiss}
          aria-label={locale === 'fr' ? 'Masquer' : 'Dismiss'}
        >
          <X />
        </Button>
      </div>
    </section>
  )
}

function ChartPanel({
  title,
  description,
  className = '',
  children,
}: {
  title: string
  description: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`min-w-0 rounded-lg border border-border bg-card/40 p-4 sm:p-5 ${className}`}>
      <div className="mb-2">
        <h2 className="font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}
