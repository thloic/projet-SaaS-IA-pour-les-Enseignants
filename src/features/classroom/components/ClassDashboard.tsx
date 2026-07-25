'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  Play,
  Search,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type {
  ClassDashboardData,
  ClassroomPeriod,
  StudentDashboardRow,
} from '@/features/classroom/types/classroomDashboard.types'
import {
  AttendanceLineChart,
  DistributionDonutChart,
  ParticipationBarChart,
  SessionActivityChart,
} from '@/features/classroom/charts/ClassroomCharts'
import ClassReportExport from '@/features/classroom/reports/ClassReportExport'

type DashboardTab = 'overview' | 'students' | 'sessions' | 'analytics'

interface ClassDashboardProps {
  data: ClassDashboardData
  activeTab: DashboardTab
}

const TABS: Array<{ id: DashboardTab; label: string; icon: typeof Eye }> = [
  { id: 'overview', label: 'Vue d’ensemble', icon: Eye },
  { id: 'students', label: 'Élèves', icon: UsersRound },
  { id: 'sessions', label: 'Séances', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

const PERIODS: Array<{ id: ClassroomPeriod; label: string }> = [
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: '90d', label: '90 jours' },
]

function formatRate(value: number | null) {
  return value === null ? '—' : `${value} %`
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', options ?? {
    day: 'numeric',
    month: 'short',
  })
}

function signalTone(student: StudentDashboardRow) {
  if (student.absenceCount >= 3) return 'text-rose-700 dark:text-rose-300'
  if (student.signals.length > 0) return 'text-amber-700 dark:text-amber-300'
  return 'text-emerald-700 dark:text-emerald-300'
}

export default function ClassDashboard({ data, activeTab }: ClassDashboardProps) {
  const [studentQuery, setStudentQuery] = useState('')
  const filteredStudents = useMemo(() => {
    const normalized = studentQuery.trim().toLocaleLowerCase('fr')
    if (!normalized) return data.students
    return data.students.filter((student) =>
      `${student.firstName} ${student.lastName} ${student.needs.join(' ')}`
        .toLocaleLowerCase('fr')
        .includes(normalized)
    )
  }, [data.students, studentQuery])

  const signaledStudents = data.students
    .filter((student) => student.signals.length > 0)
    .sort((a, b) => b.signals.length - a.signals.length)
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 lg:pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" className="-ml-2 mb-2">
            <Link href="/classroom">
              <ArrowLeft /> Mes classes
            </Link>
          </Button>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList size={21} />
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-black sm:text-3xl">
                {data.classroom.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {data.classroom.level} · {data.classroom.subject}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-nowrap">
          <ClassReportExport
            classId={data.classroom.id}
            initialPeriod={data.period}
          />
          <Button asChild variant="outline" className="min-h-10">
            <Link href={`/classroom/${data.classroom.id}/students`}>
              <UsersRound /> Gérer les élèves
            </Link>
          </Button>
          <Button asChild className="min-h-10">
            <Link href={`/classroom/${data.classroom.id}/session`}>
              <Play /> {data.activeSessionId ? 'Reprendre la séance' : 'Démarrer la séance'}
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryMetric label="Élèves" value={String(data.metrics.studentCount)} tone="blue" />
        <SummaryMetric
          label="Présence"
          value={formatRate(data.metrics.attendanceRate)}
          tone="green"
        />
        <SummaryMetric label="Retards" value={String(data.metrics.lateCount)} tone="amber" />
        <SummaryMetric label="Absences" value={String(data.metrics.absenceCount)} tone="rose" />
        <SummaryMetric
          label="Suivis"
          value={String(data.metrics.attentionCount)}
          tone="violet"
          className="col-span-2 lg:col-span-1"
        />
      </section>

      <div className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between">
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={`/classroom/${data.classroom.id}?tab=${id}&period=${data.period}`}
              className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-1 pb-2">
          {PERIODS.map((period) => (
            <Link
              key={period.id}
              href={`/classroom/${data.classroom.id}?tab=${activeTab}&period=${period.id}`}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                data.period === period.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/40'
              }`}
            >
              {period.label}
            </Link>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
          <div className="space-y-5">
            <AttendanceTrend data={data} />
            <SessionSnapshot data={data} />
            <ChartPanel
              title="Activité des séances"
              description="Participations et observations enregistrées par séance."
            >
              <SessionActivityChart sessions={data.sessions} />
            </ChartPanel>
          </div>
          <div className="space-y-5">
            <ChartPanel
              title="Répartition des présences"
              description="Ensemble des appels sur la période."
            >
              <DistributionDonutChart
                data={data.attendanceDistribution}
                emptyMessage="Aucune présence saisie sur cette période."
              />
            </ChartPanel>
            <AttentionList students={signaledStudents} />
            <RecentObservations data={data} />
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Suivi des élèves</h2>
              <p className="text-sm text-muted-foreground">
                Indicateurs calculés sur les séances de la période sélectionnée.
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={studentQuery}
                onChange={(event) => setStudentQuery(event.target.value)}
                placeholder="Rechercher un élève ou un besoin..."
                className="min-h-10 pl-9"
              />
            </div>
          </div>
          <StudentTable
            students={filteredStudents}
            classId={data.classroom.id}
          />
        </section>
      )}

      {activeTab === 'sessions' && <SessionHistory data={data} />}

      {activeTab === 'analytics' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <AttendanceTrend data={data} />
          <ChartPanel
            title="Participation par élève"
            description="Nombre d’événements saisis, sans interprétation automatique."
          >
            <ParticipationBarChart students={data.students} />
          </ChartPanel>
          <ChartPanel
            title="Catégories d’observations"
            description="Répartition des faits enregistrés par le professeur."
          >
            <DistributionDonutChart
              data={data.observationDistribution}
              emptyMessage="Aucune observation sur cette période."
            />
          </ChartPanel>
          <ChartPanel
            title="Activité des séances"
            description="Volume de participations et d’observations."
          >
            <SessionActivityChart sessions={data.sessions} />
          </ChartPanel>
          <section className="rounded-lg border border-border bg-card/40 p-4 sm:p-5 lg:col-span-2">
            <h2 className="font-bold">Signaux factuels à vérifier</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Ces éléments décrivent les données saisies ; ils ne constituent pas un diagnostic.
            </p>
            <AttentionList students={signaledStudents} compact />
          </section>
        </div>
      )}
    </div>
  )
}

function SummaryMetric({
  label,
  value,
  tone,
  className = '',
}: {
  label: string
  value: string
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'violet'
  className?: string
}) {
  const tones = {
    blue: 'border-sky-500/25 bg-sky-500/5',
    green: 'border-emerald-500/25 bg-emerald-500/5',
    amber: 'border-amber-500/25 bg-amber-500/5',
    rose: 'border-rose-500/25 bg-rose-500/5',
    violet: 'border-violet-500/25 bg-violet-500/5',
  }
  return (
    <div className={`min-h-20 rounded-lg border p-3 ${tones[tone]} ${className}`}>
      <strong className="block text-xl font-black sm:text-2xl">{value}</strong>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function AttendanceTrend({ data }: { data: ClassDashboardData }) {
  return (
    <section className="rounded-lg border border-border bg-card/40 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Présence dans le temps</h2>
          <p className="text-sm text-muted-foreground">
            {data.attendanceTrend.length} séance
            {data.attendanceTrend.length > 1 ? 's' : ''} sur la période
          </p>
        </div>
        <TrendingUp size={18} className="text-emerald-600" />
      </div>
      <AttendanceLineChart points={data.attendanceTrend} />
    </section>
  )
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card/40 p-4 sm:p-5">
      <div className="mb-2">
        <h2 className="font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function SessionSnapshot({ data }: { data: ClassDashboardData }) {
  const latest = data.sessions[0]
  return (
    <section className="rounded-lg border border-border bg-card/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold">Dernière séance</h2>
          <p className="text-sm text-muted-foreground">
            {latest ? formatDate(latest.date, { day: 'numeric', month: 'long' }) : 'Aucune séance'}
          </p>
        </div>
        <Clock3 size={18} className="text-sky-600" />
      </div>
      {!latest ? (
        <EmptyState message="Aucune donnée de séance pour le moment." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniMetric label="Présents" value={latest.presentCount} tone="green" />
          <MiniMetric label="Retards" value={latest.lateCount} tone="amber" />
          <MiniMetric label="Absents" value={latest.absenceCount} tone="rose" />
          <MiniMetric label="Observations" value={latest.observationCount} tone="blue" />
        </div>
      )}
    </section>
  )
}

function AttentionList({
  students,
  compact = false,
}: {
  students: StudentDashboardRow[]
  compact?: boolean
}) {
  const content = students.slice(0, compact ? 12 : 5)
  if (content.length === 0) {
    return compact ? (
      <EmptyState message="Aucun signal à vérifier sur cette période." />
    ) : (
      <section className="rounded-lg border border-border bg-card/40 p-4 sm:p-5">
        <h2 className="font-bold">Élèves à vérifier</h2>
        <EmptyState message="Aucun signal à vérifier sur cette période." />
      </section>
    )
  }

  const rows = (
    <div className={compact ? 'grid gap-2 md:grid-cols-2' : 'space-y-2'}>
      {content.map((student) => (
        <div key={student.id} className="flex min-w-0 items-start gap-3 rounded-lg bg-muted/30 p-3">
          <AlertCircle size={16} className={`mt-0.5 shrink-0 ${signalTone(student)}`} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {student.firstName} {student.lastName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{student.signals[0]}</p>
          </div>
        </div>
      ))}
    </div>
  )

  return compact ? rows : (
    <section className="rounded-lg border border-border bg-card/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold">Élèves à vérifier</h2>
          <p className="text-sm text-muted-foreground">Signaux issus des données saisies</p>
        </div>
        <Badge variant="outline">{students.length}</Badge>
      </div>
      {rows}
    </section>
  )
}

function RecentObservations({ data }: { data: ClassDashboardData }) {
  return (
    <section className="rounded-lg border border-border bg-card/40 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="font-bold">Observations récentes</h2>
        <p className="text-sm text-muted-foreground">Derniers faits enregistrés en séance</p>
      </div>
      {data.recentObservations.length === 0 ? (
        <EmptyState message="Aucune observation sur cette période." />
      ) : (
        <div className="space-y-3">
          {data.recentObservations.slice(0, 6).map((observation) => (
            <div key={observation.id} className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <Activity size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{observation.studentName}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(observation.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{observation.tag}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function StudentTable({
  students,
  classId,
}: {
  students: StudentDashboardRow[]
  classId: string
}) {
  if (students.length === 0) return <EmptyState message="Aucun élève ne correspond à cette recherche." />

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <div className="grid grid-cols-[minmax(180px,1.4fr)_100px_90px_110px_minmax(160px,1fr)_42px] gap-3 bg-muted/40 px-4 py-3 text-xs font-bold text-muted-foreground">
          <span>Élève</span><span>Présence</span><span>Retards</span><span>Participation</span><span>Dernière observation</span><span />
        </div>
        {students.map((student) => (
          <div key={student.id} className="grid min-h-16 grid-cols-[minmax(180px,1.4fr)_100px_90px_110px_minmax(160px,1fr)_42px] items-center gap-3 border-t border-border px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold">{student.firstName} {student.lastName}</p>
              <div className="mt-1 flex gap-1">
                {student.interventionPlan && <Badge variant="outline" className="text-[10px]">PEI/PPI</Badge>}
                {student.needs.slice(0, 1).map((need) => <Badge key={need} variant="secondary" className="text-[10px]">{need}</Badge>)}
              </div>
            </div>
            <strong>{formatRate(student.attendanceRate)}</strong>
            <span>{student.lateCount}</span>
            <span>{student.participationScore > 0 ? '+' : ''}{student.participationScore} <small className="text-muted-foreground">({student.participationEvents})</small></span>
            <span className="truncate text-muted-foreground">{student.latestObservation?.tag ?? 'Aucune'}</span>
            <Button asChild size="icon" variant="ghost">
              <Link href={`/classroom/${classId}/students`} title="Ouvrir la gestion des élèves"><ChevronRight /></Link>
            </Button>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:hidden">
        {students.map((student) => (
          <article key={student.id} className="rounded-lg border border-border bg-card/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold">{student.firstName} {student.lastName}</h3>
                <p className="text-xs text-muted-foreground">{student.needs.join(', ') || 'Aucun besoin renseigné'}</p>
              </div>
              {student.signals.length > 0 ? <AlertCircle size={17} className={signalTone(student)} /> : <CheckCircle2 size={17} className="text-emerald-600" />}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <MiniMetric label="Présence" value={formatRate(student.attendanceRate)} tone="green" />
              <MiniMetric label="Retards" value={student.lateCount} tone="amber" />
              <MiniMetric label="Participation" value={student.participationScore} tone="blue" />
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function SessionHistory({ data }: { data: ClassDashboardData }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Historique des séances</h2>
        <p className="text-sm text-muted-foreground">
          {data.sessions.length} séance{data.sessions.length > 1 ? 's' : ''} sur la période
        </p>
      </div>
      {data.sessions.length === 0 ? (
        <EmptyState message="Aucune séance sur cette période." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          {data.sessions.map((session) => (
            <div key={session.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                <CalendarDays size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{session.title}</h3>
                  {!session.endedAt && <Badge className="bg-emerald-600 text-white">En cours</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(session.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center text-xs sm:flex sm:text-left">
                <span><strong className="block text-sm">{session.presentCount}</strong>présents</span>
                <span><strong className="block text-sm">{session.lateCount}</strong>retards</span>
                <span><strong className="block text-sm">{session.participationEvents}</strong>participations</span>
                <span><strong className="block text-sm">{session.observationCount}</strong>observations</span>
              </div>
              {!session.endedAt && (
                <Button asChild variant="outline">
                  <Link href={`/classroom/${data.classroom.id}/session`}>Reprendre</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: 'green' | 'amber' | 'rose' | 'blue'
}) {
  const tones = {
    green: 'bg-emerald-500/8 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/8 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-500/8 text-rose-700 dark:text-rose-300',
    blue: 'bg-sky-500/8 text-sky-700 dark:text-sky-300',
  }
  return (
    <div className={`rounded-lg px-2 py-3 ${tones[tone]}`}>
      <strong className="block text-lg">{value}</strong>
      <span className="text-[10px] opacity-80">{label}</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
