import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassRoom,
  ClassSession,
  ParticipationEvent,
  StudentObservation,
  StudentProfile,
} from '@/features/classroom/types/classroom.types'
import type {
  ActiveClassSessionData,
  AttendanceTrendPoint,
  ClassDashboardData,
  ClassOverviewItem,
  ClassroomOverviewData,
  ClassroomPeriod,
} from '@/features/classroom/types/classroomDashboard.types'

const PERIOD_DAYS: Record<ClassroomPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

function dateBefore(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - (days - 1))
  return date.toISOString().slice(0, 10)
}

function isAttentionObservation(observation: Pick<StudentObservation, 'category' | 'tag'>) {
  const tag = observation.tag.toLocaleLowerCase('fr')
  return (
    tag.includes('suivre') ||
    tag.includes('distrait') ||
    tag.includes('non fait') ||
    observation.category === 'behavior'
  )
}

function calculateAttendanceRate(records: AttendanceRecord[]) {
  if (records.length === 0) return null
  const attending = records.filter(
    (record) => record.status === 'present' || record.status === 'late'
  ).length
  return Math.round((attending / records.length) * 100)
}

function countStatus(records: AttendanceRecord[], status: AttendanceStatus) {
  return records.filter((record) => record.status === status).length
}

const OBSERVATION_LABELS: Record<string, string> = {
  behavior: 'Comportement',
  effort: 'Effort',
  attention: 'Attention',
  homework: 'Devoirs',
  progress: 'Progrès',
  other: 'Autres',
}

export async function listClassroomOverview(): Promise<ClassroomOverviewData> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      classes: [],
      metrics: { classCount: 0, studentCount: 0, attendanceRate: null, attentionCount: 0 },
    }
  }

  const supabase = await createClient()
  const since = dateBefore(30)
  const [classesResult, linksResult, sessionsResult] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, level, subject')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('class_students')
      .select('class_id, student_id')
      .eq('user_id', user.id),
    supabase
      .from('class_sessions')
      .select('id, class_id, session_date, ended_at, created_at')
      .eq('user_id', user.id)
      .gte('session_date', since)
      .order('session_date', { ascending: false }),
  ])

  const initialError = classesResult.error ?? linksResult.error ?? sessionsResult.error
  if (initialError) {
    console.error('[classroom:dashboard] chargement de la vue globale refusé', initialError)
    throw new Error('Impossible de charger le tableau de bord des classes.')
  }

  const sessions = (sessionsResult.data ?? []) as Array<
    Pick<ClassSession, 'id' | 'class_id' | 'session_date' | 'ended_at' | 'created_at'>
  >
  const sessionIds = sessions.map((session) => session.id)
  const [attendanceResult, observationsResult] =
    sessionIds.length > 0
      ? await Promise.all([
          supabase
            .from('attendance_records')
            .select('*')
            .eq('user_id', user.id)
            .in('session_id', sessionIds),
          supabase
            .from('student_observations')
            .select('*')
            .eq('user_id', user.id)
            .in('session_id', sessionIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }]

  const relatedError = attendanceResult.error ?? observationsResult.error
  if (relatedError) {
    console.error('[classroom:dashboard] agrégats globaux refusés', relatedError)
    throw new Error('Impossible de charger les indicateurs des classes.')
  }

  const attendance = (attendanceResult.data ?? []) as AttendanceRecord[]
  const observations = (observationsResult.data ?? []) as StudentObservation[]
  const sessionClass = new Map(sessions.map((session) => [session.id, session.class_id]))

  const classes: ClassOverviewItem[] = (classesResult.data ?? []).map((classroom) => {
    const classSessions = sessions.filter((session) => session.class_id === classroom.id)
    const classSessionIds = new Set(classSessions.map((session) => session.id))
    const classAttendance = attendance.filter((record) => classSessionIds.has(record.session_id))
    const classObservations = observations.filter((record) =>
      classSessionIds.has(record.session_id)
    )
    const activeSession = classSessions.find((session) => !session.ended_at)

    return {
      id: classroom.id,
      name: classroom.name,
      level: classroom.level,
      subject: classroom.subject,
      studentCount: (linksResult.data ?? []).filter((link) => link.class_id === classroom.id)
        .length,
      attendanceRate: calculateAttendanceRate(classAttendance),
      absenceCount: countStatus(classAttendance, 'absent'),
      lateCount: countStatus(classAttendance, 'late'),
      attentionCount: new Set(
        classObservations
          .filter(isAttentionObservation)
          .map((observation) => observation.student_id)
      ).size,
      activeSessionId: activeSession?.id ?? null,
      lastSessionDate: classSessions[0]?.session_date ?? null,
    }
  })

  const allAttentionStudents = new Set(
    observations
      .filter(isAttentionObservation)
      .map((observation) => `${sessionClass.get(observation.session_id)}:${observation.student_id}`)
  )

  return {
    classes,
    metrics: {
      classCount: classes.length,
      studentCount: (linksResult.data ?? []).length,
      attendanceRate: calculateAttendanceRate(attendance),
      attentionCount: allAttentionStudents.size,
    },
  }
}

export async function getClassDashboard(
  classId: string,
  period: ClassroomPeriod
): Promise<ClassDashboardData | null> {
  const user = await getCurrentUser()
  if (!user) return null
  return getClassDashboardForUser(classId, period, user.id)
}

export async function getClassDashboardForUser(
  classId: string,
  period: ClassroomPeriod,
  userId: string
): Promise<ClassDashboardData | null> {
  const supabase = await createClient()
  const since = dateBefore(PERIOD_DAYS[period])
  const [classResult, linksResult, sessionsResult] = await Promise.all([
    supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('class_students')
      .select('student_id, student_profiles(*)')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .order('last_name', { foreignTable: 'student_profiles' })
      .order('first_name', { foreignTable: 'student_profiles' }),
    supabase
      .from('class_sessions')
      .select('*')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .gte('session_date', since)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const initialError = classResult.error ?? linksResult.error ?? sessionsResult.error
  if (initialError) {
    console.error('[classroom:dashboard] chargement du détail refusé', initialError)
    throw new Error('Impossible de charger le tableau de bord de cette classe.')
  }
  if (!classResult.data) return null

  const students = (linksResult.data ?? [])
    .map((link) => link.student_profiles as unknown as StudentProfile | null)
    .filter((student): student is StudentProfile => Boolean(student))
  const sessions = (sessionsResult.data ?? []) as ClassSession[]
  const sessionIds = sessions.map((session) => session.id)
  const [attendanceResult, participationResult, observationsResult] =
    sessionIds.length > 0
      ? await Promise.all([
          supabase
            .from('attendance_records')
            .select('*')
            .eq('user_id', userId)
            .in('session_id', sessionIds),
          supabase
            .from('participation_events')
            .select('*')
            .eq('user_id', userId)
            .in('session_id', sessionIds),
          supabase
            .from('student_observations')
            .select('*')
            .eq('user_id', userId)
            .in('session_id', sessionIds)
            .order('created_at', { ascending: false }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ]

  const relatedError =
    attendanceResult.error ?? participationResult.error ?? observationsResult.error
  if (relatedError) {
    console.error('[classroom:dashboard] chargement des agrégats refusé', relatedError)
    throw new Error('Impossible de charger les indicateurs de cette classe.')
  }

  const attendance = (attendanceResult.data ?? []) as AttendanceRecord[]
  const participation = (participationResult.data ?? []) as ParticipationEvent[]
  const observations = (observationsResult.data ?? []) as StudentObservation[]
  const studentNames = new Map(
    students.map((student) => [
      student.id,
      `${student.first_name} ${student.last_name}`.trim(),
    ])
  )

  const attendanceTrend: AttendanceTrendPoint[] = [...sessions]
    .reverse()
    .map((session) => {
      const records = attendance.filter((record) => record.session_id === session.id)
      return {
        date: session.session_date,
        rate: calculateAttendanceRate(records),
        present: countStatus(records, 'present'),
        late: countStatus(records, 'late'),
        absent: countStatus(records, 'absent'),
        excused: countStatus(records, 'excused'),
      }
    })

  const studentRows = students.map((student) => {
    const studentAttendance = attendance.filter((record) => record.student_id === student.id)
    const studentParticipation = participation.filter((event) => event.student_id === student.id)
    const studentObservations = observations.filter(
      (observation) => observation.student_id === student.id
    )
    const absenceCount = countStatus(studentAttendance, 'absent')
    const lateCount = countStatus(studentAttendance, 'late')
    const signals: string[] = []
    if (absenceCount >= 2) signals.push(`${absenceCount} absences sur la période`)
    if (lateCount >= 3) signals.push(`${lateCount} retards sur la période`)
    if (sessions.length >= 3 && studentParticipation.length === 0) {
      signals.push(`Aucune participation saisie sur ${sessions.length} séances`)
    }
    const attentionObservation = studentObservations.find(isAttentionObservation)
    if (attentionObservation) signals.push(`Observation : ${attentionObservation.tag}`)

    return {
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      needs: student.needs ?? [],
      interventionPlan: Boolean(student.intervention_plan),
      attendanceRate: calculateAttendanceRate(studentAttendance),
      absenceCount,
      lateCount,
      participationScore: studentParticipation.reduce((sum, event) => sum + event.value, 0),
      participationEvents: studentParticipation.length,
      latestObservation: studentObservations[0]
        ? {
            tag: studentObservations[0].tag,
            category: studentObservations[0].category,
            createdAt: studentObservations[0].created_at,
          }
        : null,
      signals,
    }
  })

  return {
    classroom: classResult.data as ClassRoom,
    period,
    metrics: {
      studentCount: students.length,
      attendanceRate: calculateAttendanceRate(attendance),
      absenceCount: countStatus(attendance, 'absent'),
      lateCount: countStatus(attendance, 'late'),
      attentionCount: studentRows.filter((student) => student.signals.length > 0).length,
      sessionCount: sessions.length,
    },
    attendanceTrend,
    attendanceDistribution: [
      { key: 'present', label: 'Présents', value: countStatus(attendance, 'present') },
      { key: 'late', label: 'Retards', value: countStatus(attendance, 'late') },
      { key: 'absent', label: 'Absents', value: countStatus(attendance, 'absent') },
      { key: 'excused', label: 'Excusés', value: countStatus(attendance, 'excused') },
    ],
    observationDistribution: Object.entries(OBSERVATION_LABELS).map(([key, label]) => ({
      key,
      label,
      value: observations.filter((observation) => observation.category === key).length,
    })),
    students: studentRows,
    sessions: sessions.map((session) => {
      const sessionAttendance = attendance.filter((record) => record.session_id === session.id)
      return {
        id: session.id,
        title: session.title,
        date: session.session_date,
        endedAt: session.ended_at,
        attendanceCount: sessionAttendance.length,
        presentCount: countStatus(sessionAttendance, 'present'),
        lateCount: countStatus(sessionAttendance, 'late'),
        absenceCount: countStatus(sessionAttendance, 'absent'),
        participationEvents: participation.filter((event) => event.session_id === session.id)
          .length,
        observationCount: observations.filter(
          (observation) => observation.session_id === session.id
        ).length,
      }
    }),
    recentObservations: observations.slice(0, 8).map((observation) => ({
      id: observation.id,
      studentId: observation.student_id,
      studentName: studentNames.get(observation.student_id) ?? 'Élève',
      tag: observation.tag,
      category: observation.category,
      note: observation.note,
      createdAt: observation.created_at,
    })),
    activeSessionId: sessions.find((session) => !session.ended_at)?.id ?? null,
  }
}

export async function getOrCreateClassSession(
  classId: string
): Promise<ActiveClassSessionData | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const [classResult, linksResult, sessionResult] = await Promise.all([
    supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('class_students')
      .select('student_profiles(*)')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .order('last_name', { foreignTable: 'student_profiles' })
      .order('first_name', { foreignTable: 'student_profiles' }),
    supabase
      .from('class_sessions')
      .select('*')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .eq('session_date', today)
      .is('ended_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const initialError = classResult.error ?? linksResult.error ?? sessionResult.error
  if (initialError) {
    console.error('[classroom:session] préparation refusée', initialError)
    throw new Error('Impossible de préparer cette séance.')
  }
  if (!classResult.data) return null

  let session = sessionResult.data as ClassSession | null
  if (!session) {
    const { data, error } = await supabase
      .from('class_sessions')
      .insert({
        user_id: user.id,
        class_id: classId,
        title: `Séance du ${today}`,
        session_date: today,
      })
      .select('*')
      .single()
    if (error || !data) {
      console.error('[classroom:session] création refusée', error)
      throw new Error('Impossible de démarrer cette séance.')
    }
    session = data as ClassSession
  }

  const [attendanceResult, participationResult, observationsResult] = await Promise.all([
    supabase.from('attendance_records').select('*').eq('session_id', session.id),
    supabase.from('participation_events').select('*').eq('session_id', session.id),
    supabase.from('student_observations').select('*').eq('session_id', session.id),
  ])
  const relatedError =
    attendanceResult.error ?? participationResult.error ?? observationsResult.error
  if (relatedError) {
    console.error('[classroom:session] données de séance refusées', relatedError)
    throw new Error('Impossible de charger cette séance.')
  }

  return {
    classroom: classResult.data as ClassRoom,
    session,
    students: (linksResult.data ?? [])
      .map((link) => link.student_profiles as unknown as StudentProfile | null)
      .filter((student): student is StudentProfile => Boolean(student)),
    attendance: (attendanceResult.data ?? []) as AttendanceRecord[],
    participation: (participationResult.data ?? []) as ParticipationEvent[],
    observations: (observationsResult.data ?? []) as StudentObservation[],
  }
}

export async function getClassManagementData(
  classId: string
): Promise<{ classroom: ClassRoom; students: StudentProfile[] } | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const [classResult, linksResult] = await Promise.all([
    supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('class_students')
      .select('student_profiles(*)')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .order('last_name', { foreignTable: 'student_profiles' })
      .order('first_name', { foreignTable: 'student_profiles' }),
  ])

  const error = classResult.error ?? linksResult.error
  if (error) {
    console.error('[classroom:students] chargement refusé', error)
    throw new Error('Impossible de charger les élèves de cette classe.')
  }
  if (!classResult.data) return null

  return {
    classroom: classResult.data as ClassRoom,
    students: (linksResult.data ?? [])
      .map((link) => link.student_profiles as unknown as StudentProfile | null)
      .filter((student): student is StudentProfile => Boolean(student)),
  }
}
