import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { dashboardPeriodQuerySchema } from '@/features/dashboard/schemas/dashboardPeriodSchema'
import type {
  CentralDashboardData,
  DashboardAlert,
  DashboardHistoryItem,
  DashboardPeriod,
  DashboardTrendPoint,
} from '@/features/dashboard/types/dashboard.types'

type QueryValue = string | string[] | undefined

interface DatedRow {
  created_at: string
}

interface SessionRow extends DatedRow {
  id: string
  class_id: string
  title: string
  session_date: string
  ended_at: string | null
}

interface AttendanceRow {
  session_id: string
  student_id: string
  status: 'present' | 'absent' | 'late' | 'excused'
}

interface ActivityRow {
  session_id: string
  student_id: string
}

interface ObservationRow extends ActivityRow, DatedRow {
  category: string
}

function firstQueryValue(value: QueryValue) {
  return Array.isArray(value) ? value[0] : value
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return isoDate(date)
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T12:00:00Z`).getTime()
  const end = new Date(`${to}T12:00:00Z`).getTime()
  return Math.round((end - start) / 86_400_000) + 1
}

export function resolveDashboardPeriod(query: {
  preset?: QueryValue
  from?: QueryValue
  to?: QueryValue
}): DashboardPeriod {
  const parsed = dashboardPeriodQuerySchema.safeParse({
    preset: firstQueryValue(query.preset),
    from: firstQueryValue(query.from),
    to: firstQueryValue(query.to),
  })
  const today = isoDate(new Date())
  const preset = parsed.success ? parsed.data.preset ?? '30d' : '30d'
  let to = parsed.success && parsed.data.to ? parsed.data.to : today
  let from =
    preset === '7d'
      ? addDays(to, -6)
      : preset === '90d'
        ? addDays(to, -89)
        : preset === 'custom' && parsed.success && parsed.data.from
          ? parsed.data.from
          : addDays(to, -29)

  if (from > to) [from, to] = [to, from]
  if (daysBetween(from, to) > 366) from = addDays(to, -365)

  const length = daysBetween(from, to)
  return {
    preset,
    from,
    to,
    previousFrom: addDays(from, -length),
    previousTo: addDays(from, -1),
  }
}

function inPeriod(createdAt: string, from: string, to: string) {
  const date = createdAt.slice(0, 10)
  return date >= from && date <= to
}

function attendanceRate(records: AttendanceRow[]) {
  if (records.length === 0) return 0
  const attending = records.filter(
    (record) => record.status === 'present' || record.status === 'late'
  ).length
  return Math.round((attending / records.length) * 100)
}

function normalizeStatus(status: string): DashboardHistoryItem['status'] {
  if (status === 'failed' || status === 'partial') return 'failed'
  if (status === 'generating' || status === 'pending' || status === 'draft') {
    return 'generating'
  }
  return 'complete'
}

function weekStart(value: string) {
  const date = new Date(`${value}T12:00:00Z`)
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - day + 1)
  return isoDate(date)
}

function buildTrend(
  period: DashboardPeriod,
  sessions: SessionRow[],
  attendance: AttendanceRow[],
  courses: DatedRow[],
  quizzes: DatedRow[],
  adaptations: DatedRow[],
  bulletins: DatedRow[],
  corrections: DatedRow[]
): DashboardTrendPoint[] {
  const weekly = daysBetween(period.from, period.to) > 45
  const buckets = new Map<string, DashboardTrendPoint>()
  for (
    let cursor = period.from;
    cursor <= period.to;
    cursor = addDays(cursor, weekly ? 7 : 1)
  ) {
    const key = weekly ? weekStart(cursor) : cursor
    buckets.set(key, {
      date: key,
      attendanceRate: null,
      courses: 0,
      quizzes: 0,
      adaptations: 0,
      bulletins: 0,
      corrections: 0,
    })
  }

  const keyFor = (value: string) => (weekly ? weekStart(value.slice(0, 10)) : value.slice(0, 10))
  const increment = (
    rows: DatedRow[],
    field: 'courses' | 'quizzes' | 'adaptations' | 'bulletins' | 'corrections'
  ) => {
    rows.forEach((row) => {
      const bucket = buckets.get(keyFor(row.created_at))
      if (bucket) bucket[field] += 1
    })
  }
  increment(courses, 'courses')
  increment(quizzes, 'quizzes')
  increment(adaptations, 'adaptations')
  increment(bulletins, 'bulletins')
  increment(corrections, 'corrections')

  const sessionMap = new Map(sessions.map((session) => [session.id, session]))
  buckets.forEach((bucket, key) => {
    const records = attendance.filter((record) => {
      const session = sessionMap.get(record.session_id)
      return session ? keyFor(session.session_date) === key : false
    })
    bucket.attendanceRate = records.length > 0 ? attendanceRate(records) : null
  })
  return [...buckets.values()]
}

function safeRows<T>(name: string, result: { data: T[] | null; error: unknown }) {
  if (result.error) {
    console.error(`[dashboard] module ${name} indisponible`, result.error)
    return [] as T[]
  }
  return result.data ?? []
}

export async function loadCentralDashboard(
  query: { preset?: QueryValue; from?: QueryValue; to?: QueryValue } = {}
): Promise<CentralDashboardData> {
  const period = resolveDashboardPeriod(query)
  const user = await getCurrentUser()
  const empty: CentralDashboardData = {
    teacher: { firstName: '', fullName: 'Enseignant' },
    period,
    metrics: [],
    classCount: 0,
    sessionCount: 0,
    trend: [],
    attendanceDistribution: [],
    observationDistribution: [],
    classEngagement: [],
    correctionWorkload: [],
    contentCounts: {
      courses: 0,
      quizzes: 0,
      adaptations: 0,
      bulletins: 0,
      corrections: 0,
      documents: 0,
    },
    alerts: [],
    history: [],
  }
  if (!user) return empty

  const supabase = await createClient()
  const fromTimestamp = `${period.previousFrom}T00:00:00.000Z`
  const toTimestamp = `${period.to}T23:59:59.999Z`
  const month = new Date().toISOString().slice(0, 7)

  const [
    profileResult,
    classesResult,
    studentsResult,
    sessionsResult,
    coursesResult,
    quizzesResult,
    bulletinsResult,
    adaptationsResult,
    correctionsResult,
    documentsResult,
    usageResult,
  ] = await Promise.all([
    supabase
      .from('teacher_profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('classes').select('id, name').eq('user_id', user.id).order('name'),
    supabase.from('class_students').select('class_id, student_id').eq('user_id', user.id),
    supabase
      .from('class_sessions')
      .select('id, class_id, title, session_date, ended_at, created_at')
      .eq('user_id', user.id)
      .gte('session_date', period.previousFrom)
      .lte('session_date', period.to)
      .order('session_date', { ascending: false }),
    supabase
      .from('courses')
      .select('id, title, subject, status, created_at')
      .eq('user_id', user.id)
      .gte('created_at', fromTimestamp)
      .lte('created_at', toTimestamp),
    supabase
      .from('quizzes')
      .select('id, title, subject, created_at')
      .eq('user_id', user.id)
      .gte('created_at', fromTimestamp)
      .lte('created_at', toTimestamp),
    supabase
      .from('bulletin_comments')
      .select('id, student_name, subject, created_at')
      .eq('user_id', user.id)
      .gte('created_at', fromTimestamp)
      .lte('created_at', toTimestamp),
    supabase
      .from('adaptation_sets')
      .select('id, title, subject, status, created_at')
      .eq('user_id', user.id)
      .gte('created_at', fromTimestamp)
      .lte('created_at', toTimestamp),
    supabase
      .from('correction_batches')
      .select('id, class_id, status, created_at')
      .eq('user_id', user.id)
      .gte('created_at', fromTimestamp)
      .lte('created_at', toTimestamp),
    supabase
      .from('source_documents')
      .select('id, title, source_type, created_at')
      .eq('user_id', user.id)
      .gte('created_at', fromTimestamp)
      .lte('created_at', toTimestamp),
    supabase
      .from('usage_counters')
      .select('count')
      .eq('user_id', user.id)
      .eq('period', month)
      .maybeSingle(),
  ])

  const classes = safeRows('classes', classesResult)
  const studentLinks = safeRows('élèves', studentsResult)
  const allSessions = safeRows('séances', sessionsResult) as SessionRow[]
  const courses = safeRows('cours', coursesResult)
  const quizzes = safeRows('quiz', quizzesResult)
  const bulletins = safeRows('bulletins', bulletinsResult)
  const adaptations = safeRows('adaptations', adaptationsResult)
  const corrections = safeRows('corrections', correctionsResult)
  const documents = safeRows('documents', documentsResult)

  const sessionIds = allSessions.map((session) => session.id)
  const correctionIds = corrections.map((batch) => batch.id)
  const [attendanceResult, participationResult, observationsResult, correctionCopiesResult] =
    await Promise.all([
      sessionIds.length
        ? supabase
            .from('attendance_records')
            .select('session_id, student_id, status')
            .eq('user_id', user.id)
            .in('session_id', sessionIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length
        ? supabase
            .from('participation_events')
            .select('session_id, student_id')
            .eq('user_id', user.id)
            .in('session_id', sessionIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length
        ? supabase
            .from('student_observations')
            .select('session_id, student_id, category, created_at')
            .eq('user_id', user.id)
            .in('session_id', sessionIds)
        : Promise.resolve({ data: [], error: null }),
      correctionIds.length
        ? supabase
            .from('correction_copies')
            .select('batch_id, status')
            .eq('user_id', user.id)
            .in('batch_id', correctionIds)
        : Promise.resolve({ data: [], error: null }),
    ])

  const attendance = safeRows('présences', attendanceResult) as AttendanceRow[]
  const participation = safeRows('participations', participationResult) as ActivityRow[]
  const observations = safeRows('observations', observationsResult) as ObservationRow[]
  const correctionCopies = safeRows('copies corrigées', correctionCopiesResult)
  const currentSessions = allSessions.filter((row) =>
    inPeriod(row.session_date, period.from, period.to)
  )
  const previousSessions = allSessions.filter((row) =>
    inPeriod(row.session_date, period.previousFrom, period.previousTo)
  )
  const currentSessionIds = new Set(currentSessions.map((row) => row.id))
  const previousSessionIds = new Set(previousSessions.map((row) => row.id))
  const currentAttendance = attendance.filter((row) => currentSessionIds.has(row.session_id))
  const previousAttendance = attendance.filter((row) => previousSessionIds.has(row.session_id))
  const currentParticipation = participation.filter((row) => currentSessionIds.has(row.session_id))
  const currentObservations = observations.filter((row) => currentSessionIds.has(row.session_id))
  const currentRows = <T extends DatedRow>(rows: T[]) =>
    rows.filter((row) => inPeriod(row.created_at, period.from, period.to))

  const currentCourses = currentRows(courses)
  const currentQuizzes = currentRows(quizzes)
  const currentBulletins = currentRows(bulletins)
  const currentAdaptations = currentRows(adaptations)
  const currentCorrections = currentRows(corrections)
  const currentDocuments = currentRows(documents)
  const classNames = new Map(classes.map((item) => [item.id, item.name]))
  const classEngagement = classes.map((classroom) => {
    const classSessionIds = new Set(
      currentSessions
        .filter((session) => session.class_id === classroom.id)
        .map((session) => session.id)
    )
    const classAttendance = currentAttendance.filter((record) =>
      classSessionIds.has(record.session_id)
    )
    return {
      id: classroom.id,
      name: classroom.name,
      studentCount: studentLinks.filter((link) => link.class_id === classroom.id).length,
      attendanceRate: classAttendance.length ? attendanceRate(classAttendance) : null,
      participations: currentParticipation.filter((event) =>
        classSessionIds.has(event.session_id)
      ).length,
      observations: currentObservations.filter((event) =>
        classSessionIds.has(event.session_id)
      ).length,
    }
  })

  const attentionStudents = new Set(
    currentObservations
      .filter((item) => item.category === 'behavior' || item.category === 'attention')
      .map((item) => item.student_id)
  )
  const pendingCopies = correctionCopies.filter((copy) =>
    ['pending', 'generating'].includes(copy.status)
  ).length
  const failedCopies = correctionCopies.filter((copy) => copy.status === 'failed').length
  const used = usageResult.error ? 0 : Number(usageResult.data?.count ?? 0)
  const usageLimit = 3
  const alerts: DashboardAlert[] = []
  const emptyClasses = classEngagement.filter((item) => item.studentCount === 0)
  if (classes.length === 0) {
    alerts.push({
      id: 'no-class',
      target: 'students',
      severity: 'info',
      title: 'Créez votre première classe',
      message: 'Ajoutez une classe pour commencer le suivi des élèves.',
      titleEn: 'Create your first class',
      messageEn: 'Add a class to start tracking students.',
      href: '/classroom',
    })
  } else if (emptyClasses.length > 0) {
    alerts.push({
      id: 'empty-classes',
      target: 'students',
      severity: 'warning',
      title: 'Vérifiez le nombre d’élèves',
      message: `${emptyClasses.length} classe${emptyClasses.length > 1 ? 's ne contiennent' : ' ne contient'} encore aucun élève.`,
      titleEn: 'Check your student count',
      messageEn: `${emptyClasses.length} class${emptyClasses.length > 1 ? 'es do' : ' does'} not contain any students yet.`,
      href: '/classroom',
    })
  }
  if (currentSessions.length > 0 && currentAttendance.length === 0) {
    alerts.push({
      id: 'missing-attendance',
      target: 'attendance',
      severity: 'warning',
      title: 'Présences non renseignées',
      message: 'Des séances existent sur cette période, mais aucun appel n’a été enregistré.',
      titleEn: 'Attendance is missing',
      messageEn: 'Sessions exist in this period, but no attendance has been recorded.',
      href: '/classroom',
    })
  }
  if (attentionStudents.size > 0) {
    alerts.push({
      id: 'student-attention',
      target: 'attention',
      severity: 'warning',
      title: 'Suivis à vérifier',
      message: `${attentionStudents.size} élève${attentionStudents.size > 1 ? 's présentent' : ' présente'} des observations d’attention ou de comportement.`,
      titleEn: 'Follow-ups to check',
      messageEn: `${attentionStudents.size} student${attentionStudents.size > 1 ? 's have' : ' has'} attention or behaviour observations.`,
      href: '/classroom',
    })
  }
  if (pendingCopies > 0 || failedCopies > 0) {
    alerts.push({
      id: 'correction-workload',
      target: 'corrections',
      severity: failedCopies > 0 ? 'critical' : 'info',
      title: failedCopies > 0 ? 'Corrections à relancer' : 'Corrections en cours',
      message:
        failedCopies > 0
          ? `${failedCopies} copie${failedCopies > 1 ? 's ont' : ' a'} échoué.`
          : `${pendingCopies} copie${pendingCopies > 1 ? 's sont' : ' est'} encore en attente.`,
      titleEn: failedCopies > 0 ? 'Grading to retry' : 'Grading in progress',
      messageEn:
        failedCopies > 0
          ? `${failedCopies} cop${failedCopies > 1 ? 'ies have' : 'y has'} failed.`
          : `${pendingCopies} cop${pendingCopies > 1 ? 'ies are' : 'y is'} still pending.`,
      href: '/correction',
    })
  }
  if (usageLimit - used <= 1) {
    alerts.push({
      id: 'usage-limit',
      target: 'usage',
      severity: used >= usageLimit ? 'critical' : 'warning',
      title: used >= usageLimit ? 'Limite mensuelle atteinte' : 'Une génération restante',
      message: `${used}/${usageLimit} générations gratuites utilisées ce mois-ci.`,
      titleEn: used >= usageLimit ? 'Monthly limit reached' : 'One generation remaining',
      messageEn: `${used}/${usageLimit} free generations used this month.`,
      href: '/settings',
    })
  }

  const history: DashboardHistoryItem[] = [
    ...currentCourses.map((item) => ({
      id: `course:${item.id}`,
      type: 'course' as const,
      title: item.title,
      subtitle: item.subject,
      status: normalizeStatus(item.status),
      createdAt: item.created_at,
      href: `/courses/${item.id}`,
    })),
    ...currentQuizzes.map((item) => ({
      id: `quiz:${item.id}`,
      type: 'quiz' as const,
      title: item.title,
      subtitle: item.subject ?? 'Quiz',
      status: 'complete' as const,
      createdAt: item.created_at,
      href: `/quiz/${item.id}`,
    })),
    ...currentAdaptations.map((item) => ({
      id: `adaptation:${item.id}`,
      type: 'adaptation' as const,
      title: item.title,
      subtitle: item.subject,
      status: normalizeStatus(item.status),
      createdAt: item.created_at,
      href: `/adaptations/${item.id}`,
    })),
    ...currentBulletins.map((item) => ({
      id: `bulletin:${item.id}`,
      type: 'bulletin' as const,
      title: `Bulletin — ${item.student_name}`,
      subtitle: item.subject,
      status: 'complete' as const,
      createdAt: item.created_at,
      href: '/bulletin',
    })),
    ...currentCorrections.map((item) => ({
      id: `correction:${item.id}`,
      type: 'correction' as const,
      title: `Correction — ${classNames.get(item.class_id) ?? 'Classe'}`,
      subtitle: 'Lot de copies',
      status: normalizeStatus(item.status),
      createdAt: item.created_at,
      href: `/correction/${item.id}`,
    })),
    ...currentDocuments.map((item) => ({
      id: `document:${item.id}`,
      type: 'document' as const,
      title: item.title,
      subtitle: item.source_type === 'file' ? 'Document importé' : 'Texte source',
      status: 'info' as const,
      createdAt: item.created_at,
      href: '/documents',
    })),
    ...currentSessions.map((item) => ({
      id: `session:${item.id}`,
      type: 'session' as const,
      title: item.title,
      subtitle: classNames.get(item.class_id) ?? 'Classe',
      status: item.ended_at ? ('complete' as const) : ('generating' as const),
      createdAt: item.created_at,
      href: `/classroom/${item.class_id}`,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const profile = profileResult.error ? null : profileResult.data
  return {
    teacher: {
      firstName: profile?.first_name ?? '',
      fullName:
        `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Enseignant',
    },
    period,
    metrics: [
      {
        key: 'attendance',
        value: currentAttendance.length ? attendanceRate(currentAttendance) : null,
        suffix: '%',
        previousValue: previousAttendance.length ? attendanceRate(previousAttendance) : null,
      },
      {
        key: 'students',
        value: studentLinks.length,
        previousValue: null,
      },
      {
        key: 'attention',
        value: attentionStudents.size,
        previousValue: null,
      },
      {
        key: 'corrections',
        value: pendingCopies + failedCopies,
        previousValue: null,
      },
      {
        key: 'usage',
        value: used,
        suffix: `/${usageLimit}`,
        previousValue: null,
      },
    ],
    classCount: classes.length,
    sessionCount: currentSessions.length,
    trend: buildTrend(
      period,
      currentSessions,
      currentAttendance,
      currentCourses,
      currentQuizzes,
      currentAdaptations,
      currentBulletins,
      currentCorrections
    ),
    attendanceDistribution: ['present', 'late', 'absent', 'excused'].map((key) => ({
      key,
      label:
        key === 'present'
          ? 'Présents'
          : key === 'late'
            ? 'Retards'
            : key === 'absent'
              ? 'Absents'
              : 'Excusés',
      labelEn:
        key === 'present'
          ? 'Present'
          : key === 'late'
            ? 'Late'
            : key === 'absent'
              ? 'Absent'
              : 'Excused',
      value: currentAttendance.filter((item) => item.status === key).length,
    })),
    observationDistribution: [
      ['behavior', 'Comportement', 'Behaviour'],
      ['effort', 'Effort', 'Effort'],
      ['attention', 'Attention', 'Attention'],
      ['homework', 'Devoirs', 'Homework'],
      ['progress', 'Progrès', 'Progress'],
      ['other', 'Autres', 'Other'],
    ].map(([key, label, labelEn]) => ({
      key,
      label,
      labelEn,
      value: currentObservations.filter((item) => item.category === key).length,
    })),
    classEngagement,
    correctionWorkload: [
      {
        key: 'pending',
        label: 'En attente',
        labelEn: 'Pending',
        value: correctionCopies.filter((copy) => copy.status === 'pending').length,
      },
      {
        key: 'generating',
        label: 'En cours',
        labelEn: 'In progress',
        value: correctionCopies.filter((copy) => copy.status === 'generating').length,
      },
      {
        key: 'complete',
        label: 'Terminées',
        labelEn: 'Complete',
        value: correctionCopies.filter((copy) =>
          ['complete', 'validated'].includes(copy.status)
        ).length,
      },
      { key: 'failed', label: 'Échouées', labelEn: 'Failed', value: failedCopies },
    ],
    contentCounts: {
      courses: currentCourses.length,
      quizzes: currentQuizzes.length,
      adaptations: currentAdaptations.length,
      bulletins: currentBulletins.length,
      corrections: currentCorrections.length,
      documents: currentDocuments.length,
    },
    alerts,
    history,
  }
}
