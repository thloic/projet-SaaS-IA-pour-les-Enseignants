'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  MessageSquarePlus,
  Minus,
  Plus,
  Sparkles,
  UserCheck,
  UserMinus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { observationSchema } from '@/features/classroom/schemas/classroomSchema'
import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassRoom,
  ClassSession,
  ClassStudent,
  ObservationCategory,
  ParticipationEvent,
  StudentObservation,
  StudentProfile,
} from '@/features/classroom/types/classroom.types'

const BRAND = '#534AB7'

const attendanceOptions: Array<{
  status: AttendanceStatus
  label: string
  icon: typeof Check
  className: string
}> = [
  { status: 'present', label: 'Present', icon: UserCheck, className: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
  { status: 'late', label: 'Retard', icon: Clock, className: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
  { status: 'absent', label: 'Absent', icon: UserMinus, className: 'border-rose-500/40 text-rose-300 bg-rose-500/10' },
  { status: 'excused', label: 'Excuse', icon: Check, className: 'border-sky-500/40 text-sky-300 bg-sky-500/10' },
]

const observationTags: Array<{ category: ObservationCategory; tag: string }> = [
  { category: 'attention', tag: 'Attentif' },
  { category: 'attention', tag: 'Distrait' },
  { category: 'effort', tag: 'Effort notable' },
  { category: 'progress', tag: 'Progres visible' },
  { category: 'behavior', tag: 'Aide un camarade' },
  { category: 'homework', tag: 'Devoir non fait' },
  { category: 'other', tag: 'A suivre' },
]

interface ClassSessionPageProps {
  classId: string
}

type JoinedStudent = ClassStudent & {
  student_profiles: StudentProfile | null
}

export default function ClassSessionPage({ classId }: ClassSessionPageProps) {
  const router = useRouter()
  const [classroom, setClassroom] = useState<ClassRoom | null>(null)
  const [session, setSession] = useState<ClassSession | null>(null)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [participation, setParticipation] = useState<ParticipationEvent[]>([])
  const [observations, setObservations] = useState<StudentObservation[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
  const [selectedTag, setSelectedTag] = useState(observationTags[0])
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingObservation, setIsSavingObservation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const attendanceByStudent = useMemo(() => {
    const map = new Map<string, AttendanceRecord>()
    attendance.forEach((record) => map.set(record.student_id, record))
    return map
  }, [attendance])

  const participationByStudent = useMemo(() => {
    const map = new Map<string, number>()
    participation.forEach((event) => {
      map.set(event.student_id, (map.get(event.student_id) ?? 0) + event.value)
    })
    return map
  }, [participation])

  const observationsByStudent = useMemo(() => {
    const map = new Map<string, StudentObservation[]>()
    observations.forEach((observation) => {
      map.set(observation.student_id, [...(map.get(observation.student_id) ?? []), observation])
    })
    return map
  }, [observations])

  const summary = useMemo(() => {
    return attendance.reduce(
      (acc, record) => {
        acc[record.status] += 1
        return acc
      },
      { present: 0, absent: 0, late: 0, excused: 0 } as Record<AttendanceStatus, number>
    )
  }, [attendance])

  async function bootstrapSession() {
    await Promise.resolve()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setIsLoading(false)
      setError('Connectez-vous pour demarrer une session.')
      return
    }

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle()

    if (classError || !classData) {
      setIsLoading(false)
      setError(classError?.message ?? 'Classe introuvable.')
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const { data: existingSession, error: sessionError } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('class_id', classId)
      .eq('session_date', today)
      .is('ended_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError) {
      setIsLoading(false)
      setError(sessionError.message)
      return
    }

    let activeSession = existingSession as ClassSession | null

    if (!activeSession) {
      const { data: newSession, error: createError } = await supabase
        .from('class_sessions')
        .insert({
          user_id: user.id,
          class_id: classId,
          title: `Session du ${today}`,
          session_date: today,
        })
        .select('*')
        .single()

      if (createError || !newSession) {
        setIsLoading(false)
        setError(createError?.message ?? 'Impossible de creer la session.')
        return
      }

      activeSession = newSession as ClassSession
    }

    const { data: links, error: linkError } = await supabase
      .from('class_students')
      .select('id, user_id, class_id, student_id, student_profiles(*)')
      .eq('class_id', classId)
      .order('last_name', { foreignTable: 'student_profiles' })
      .order('first_name', { foreignTable: 'student_profiles' })

    if (linkError) {
      setIsLoading(false)
      setError(linkError.message)
      return
    }

    const joined = (links ?? []) as unknown as JoinedStudent[]
    const roster = joined.map((item) => item.student_profiles).filter(Boolean) as StudentProfile[]

    setClassroom(classData as ClassRoom)
    setSession(activeSession)
    setStudents(roster)
    await loadSessionData(activeSession.id)
    setIsLoading(false)
  }

  async function loadSessionData(sessionId: string) {
    const supabase = createClient()
    const [attendanceResult, participationResult, observationResult] = await Promise.all([
      supabase.from('attendance_records').select('*').eq('session_id', sessionId),
      supabase.from('participation_events').select('*').eq('session_id', sessionId),
      supabase.from('student_observations').select('*').eq('session_id', sessionId),
    ])

    if (attendanceResult.error) setError(attendanceResult.error.message)
    if (participationResult.error) setError(participationResult.error.message)
    if (observationResult.error) setError(observationResult.error.message)

    setAttendance((attendanceResult.data ?? []) as AttendanceRecord[])
    setParticipation((participationResult.data ?? []) as ParticipationEvent[])
    setObservations((observationResult.data ?? []) as StudentObservation[])
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrapSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId])

  async function markAttendance(studentId: string, status: AttendanceStatus) {
    if (!session) return

    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Session utilisateur introuvable.')
      return
    }

    const { error: upsertError } = await supabase.from('attendance_records').upsert(
      {
        user_id: user.id,
        session_id: session.id,
        student_id: studentId,
        status,
      },
      { onConflict: 'session_id,student_id' }
    )

    if (upsertError) {
      setError(upsertError.message)
      return
    }

    await loadSessionData(session.id)
  }

  async function addParticipation(studentId: string, value: -1 | 1 | 2, label: string) {
    if (!session) return

    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Session utilisateur introuvable.')
      return
    }

    const { error: insertError } = await supabase.from('participation_events').insert({
      user_id: user.id,
      session_id: session.id,
      student_id: studentId,
      value,
      label,
    })

    if (insertError) {
      setError(insertError.message)
      return
    }

    await loadSessionData(session.id)
  }

  async function saveObservation() {
    if (!session || !selectedStudent) return

    setError(null)
    const parsed = observationSchema.safeParse({
      category: selectedTag.category,
      tag: selectedTag.tag,
      note,
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Observation incomplete.')
      return
    }

    setIsSavingObservation(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsSavingObservation(false)
      setError('Session utilisateur introuvable.')
      return
    }

    const { error: insertError } = await supabase.from('student_observations').insert({
      user_id: user.id,
      session_id: session.id,
      student_id: selectedStudent.id,
      category: parsed.data.category,
      tag: parsed.data.tag,
      note: parsed.data.note || null,
    })

    setIsSavingObservation(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setSelectedStudent(null)
    setNote('')
    await loadSessionData(session.id)
  }

  async function closeSession() {
    if (!session) return

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('class_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    router.push(`/classroom/${classId}`)
    router.refresh()
  }

  if (isLoading) {
    return <div className="mx-auto max-w-6xl text-sm text-muted-foreground">Preparation de la session...</div>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-28 lg:pb-8">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <button
            onClick={() => router.push(`/classroom/${classId}`)}
            className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Retour a la classe
          </button>
          <h1 className="text-2xl font-black">{classroom?.name ?? 'Session'}</h1>
          <p className="text-sm text-muted-foreground">
            {session?.title} · {students.length} eleves
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center sm:flex sm:text-left">
          <SummaryBadge label="Presents" value={summary.present} color="text-emerald-300" />
          <SummaryBadge label="Retards" value={summary.late} color="text-amber-300" />
          <SummaryBadge label="Absents" value={summary.absent} color="text-rose-300" />
          <SummaryBadge label="Notes" value={observations.length} color="text-sky-300" />
        </div>
      </section>

      {error && (
        <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          Ajoutez des eleves avant de faire l&apos;appel.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {students.map((student) => {
            const record = attendanceByStudent.get(student.id)
            const score = participationByStudent.get(student.id) ?? 0
            const studentObservations = observationsByStudent.get(student.id) ?? []

            return (
              <article key={student.id} className="rounded-2xl border border-border bg-card/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      onClick={() => {
                        setSelectedStudent(student)
                        setSelectedTag(observationTags[0])
                      }}
                      className="block max-w-full truncate text-left font-bold hover:text-primary"
                    >
                      {student.first_name} {student.last_name}
                    </button>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {student.sex}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Participation {score > 0 ? `+${score}` : score}
                      </Badge>
                      {record && (
                        <Badge variant="outline" className="text-[10px]">
                          {attendanceOptions.find((item) => item.status === record.status)?.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStudent(student)
                      setSelectedTag(observationTags[0])
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    aria-label="Ajouter une observation"
                  >
                    <MessageSquarePlus size={18} />
                  </button>
                </div>
                {studentObservations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {studentObservations.slice(-3).map((observation) => (
                      <Badge key={observation.id} variant="outline" className="text-[10px]">
                        {observation.tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {attendanceOptions.map(({ status, label, icon: Icon, className }) => {
                    const active = record?.status === status
                    return (
                      <button
                        key={status}
                        onClick={() => markAttendance(student.id, status)}
                        className={`flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold transition-colors ${
                          active ? className : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <Icon size={15} /> {label}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => addParticipation(student.id, -1, 'Participation faible')}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border bg-muted/20 text-sm font-semibold text-muted-foreground hover:bg-muted/40"
                  >
                    <Minus size={15} /> Faible
                  </button>
                  <button
                    onClick={() => addParticipation(student.id, 1, 'Participation positive')}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm font-semibold text-emerald-300"
                  >
                    <Plus size={15} /> Active
                  </button>
                  <button
                    onClick={() => addParticipation(student.id, 2, 'Participation forte')}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-violet-500/30 bg-violet-500/10 text-sm font-semibold text-violet-300"
                  >
                    <Sparkles size={15} /> Forte
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">Resume de session</h2>
            <p className="text-sm text-muted-foreground">
              {attendance.length}/{students.length} appels saisis · {participation.length} evenements de participation · {observations.length} observations
            </p>
          </div>
          <Button variant="outline" onClick={closeSession} disabled={!session}>
            Terminer la session
          </Button>
        </div>
      </section>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:justify-center sm:p-4">
          <div className="w-full rounded-t-2xl border border-border bg-card p-4 shadow-xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">
                  Observation · {selectedStudent.first_name} {selectedStudent.last_name}
                </h2>
                <p className="text-sm text-muted-foreground">Choisissez un tag rapide ou ajoutez une note.</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg border border-border px-2 py-1 text-sm text-muted-foreground hover:bg-muted/40"
              >
                Fermer
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {observationTags.map((item) => (
                <button
                  key={`${item.category}-${item.tag}`}
                  onClick={() => setSelectedTag(item)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    selectedTag.tag === item.tag
                      ? 'border-transparent text-white'
                      : 'border-border text-muted-foreground hover:bg-muted/40'
                  }`}
                  style={selectedTag.tag === item.tag ? { backgroundColor: BRAND } : {}}
                >
                  {item.tag}
                </button>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Note courte optionnelle..."
              className="mt-4 min-h-24 w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />

            <Button
              onClick={saveObservation}
              disabled={isSavingObservation}
              className="mt-4 h-11 w-full text-white"
              style={{ backgroundColor: BRAND }}
            >
              {isSavingObservation ? 'Enregistrement...' : 'Enregistrer observation'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 px-3 py-2">
      <p className={`text-lg font-black ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
