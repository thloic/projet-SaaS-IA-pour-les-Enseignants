import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { attendanceRegisterRangeSchema } from '@/features/classroom/schemas/attendanceRegisterSchema'
import type {
  AttendanceRegisterData,
  AttendanceRegisterStudent,
} from '@/features/classroom/types/attendanceRegister.types'
import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassRoom,
  ClassSession,
  StudentProfile,
} from '@/features/classroom/types/classroom.types'
import { normalizeTimeZone } from '@/lib/timezone'

const EMPTY_TOTALS = { present: 0, absent: 0, late: 0, excused: 0, unrecorded: 0 }

function totalsForStatuses(statuses: Array<AttendanceStatus | 'not_enrolled' | null>) {
  const totals = { ...EMPTY_TOTALS }
  for (const status of statuses) {
    if (status === 'not_enrolled') continue
    totals[status ?? 'unrecorded'] += 1
  }
  return totals
}

export async function getAttendanceRegisterForUser(
  classId: string,
  range: { from: string; to: string },
  userId: string
): Promise<AttendanceRegisterData | null> {
  const parsedRange = attendanceRegisterRangeSchema.safeParse(range)
  if (!parsedRange.success) throw new Error('INVALID_ATTENDANCE_RANGE')

  const supabase = await createClient()
  const [classResult, linksResult, sessionsResult, profileResult] = await Promise.all([
    supabase.from('classes').select('*').eq('id', classId).eq('user_id', userId).maybeSingle(),
    supabase
      .from('class_students')
      .select('student_id, created_at')
      .eq('class_id', classId)
      .eq('user_id', userId),
    supabase
      .from('class_sessions')
      .select('*')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .gte('session_date', parsedRange.data.from)
      .lte('session_date', parsedRange.data.to)
      .order('session_date', { ascending: true })
      .order('started_at', { ascending: true }),
    supabase.from('teacher_profiles').select('timezone').eq('user_id', userId).maybeSingle(),
  ])

  const initialError = classResult.error ?? linksResult.error ?? sessionsResult.error ?? profileResult.error
  if (initialError) {
    console.error('[classroom:register] chargement refusé', initialError)
    throw new Error('ATTENDANCE_REGISTER_LOAD_FAILED')
  }
  if (!classResult.data) return null

  const sessions = (sessionsResult.data ?? []) as ClassSession[]
  const sessionIds = sessions.map((session) => session.id)
  const attendanceResult = sessionIds.length
    ? await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .in('session_id', sessionIds)
    : { data: [], error: null }
  if (attendanceResult.error) {
    console.error('[classroom:register] présences refusées', attendanceResult.error)
    throw new Error('ATTENDANCE_REGISTER_LOAD_FAILED')
  }

  const attendance = (attendanceResult.data ?? []) as AttendanceRecord[]
  const activeLinks = new Map(
    (linksResult.data ?? []).map((link) => [link.student_id, link.created_at])
  )
  const studentIds = new Set(activeLinks.keys())
  attendance.forEach((record) => studentIds.add(record.student_id))
  const profilesResult = studentIds.size
    ? await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', userId)
        .in('id', [...studentIds])
        .order('last_name')
        .order('first_name')
    : { data: [], error: null }
  if (profilesResult.error) {
    console.error('[classroom:register] profils refusés', profilesResult.error)
    throw new Error('ATTENDANCE_REGISTER_LOAD_FAILED')
  }

  const recordBySessionStudent = new Map(
    attendance.map((record) => [`${record.session_id}:${record.student_id}`, record.status])
  )
  const profiles = (profilesResult.data ?? []) as StudentProfile[]
  const students: AttendanceRegisterStudent[] = profiles.map((profile) => {
    const activeSince = activeLinks.get(profile.id)
    const statuses: AttendanceRegisterStudent['statuses'] = Object.fromEntries(
      sessions.map((session) => {
        const recorded = recordBySessionStudent.get(`${session.id}:${profile.id}`)
        if (recorded) return [session.id, recorded] as const
        if (!activeSince || session.started_at < activeSince) {
          return [session.id, 'not_enrolled'] as const
        }
        return [session.id, null] as const
      })
    )
    return {
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      statuses,
      totals: totalsForStatuses(Object.values(statuses)),
    }
  })

  const registerSessions = sessions.map((session) => {
    const statuses = students.map((student) => student.statuses[session.id] ?? null)
    return {
      id: session.id,
      title: session.title,
      date: session.session_date,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      totals: totalsForStatuses(statuses),
    }
  })

  return {
    classroom: classResult.data as ClassRoom,
    from: parsedRange.data.from,
    to: parsedRange.data.to,
    timeZone: normalizeTimeZone(profileResult.data?.timezone),
    sessions: registerSessions,
    students,
    totals: totalsForStatuses(
      students.flatMap((student) => Object.values(student.statuses))
    ),
  }
}
