'use client'

import { useMemo, useRef, useState } from 'react'
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
import { useToast } from '@/components/shared/ToastProvider'
import {
  addObservationAction,
  addParticipationAction,
  closeClassSessionAction,
  markAttendanceAction,
} from '@/features/classroom/server/classroom.actions'
import type {
  AttendanceRecord,
  AttendanceStatus,
  ObservationCategory,
  ParticipationEvent,
  StudentObservation,
  StudentProfile,
} from '@/features/classroom/types/classroom.types'
import type { ActiveClassSessionData } from '@/features/classroom/types/classroomDashboard.types'

const BRAND = '#534AB7'

const attendanceOptions: Array<{
  status: AttendanceStatus
  label: string
  icon: typeof Check
  className: string
}> = [
  { status: 'present', label: 'Present', icon: UserCheck, className: 'border-emerald-500/40 text-emerald-700 bg-emerald-500/10 dark:text-emerald-300' },
  { status: 'late', label: 'Retard', icon: Clock, className: 'border-amber-500/40 text-amber-700 bg-amber-500/10 dark:text-amber-300' },
  { status: 'absent', label: 'Absent', icon: UserMinus, className: 'border-rose-500/40 text-rose-700 bg-rose-500/10 dark:text-rose-300' },
  { status: 'excused', label: 'Excuse', icon: Check, className: 'border-sky-500/40 text-sky-700 bg-sky-500/10 dark:text-sky-300' },
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
  initialData: ActiveClassSessionData
}

export default function ClassSessionPage({ classId, initialData }: ClassSessionPageProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const classroom = initialData.classroom
  const session = initialData.session
  const students = initialData.students
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialData.attendance)
  const [participation, setParticipation] = useState<ParticipationEvent[]>(initialData.participation)
  const [observations, setObservations] = useState<StudentObservation[]>(initialData.observations)
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
  const [selectedTag, setSelectedTag] = useState(observationTags[0])
  const [note, setNote] = useState('')
  const [isSavingObservation, setIsSavingObservation] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState<string[]>([])
  const [isClosing, setIsClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const optimisticEventId = useRef(0)

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

  async function markAttendance(studentId: string, status: AttendanceStatus) {
    setError(null)
    const previous = attendance.find((record) => record.student_id === studentId) ?? null
    const optimistic: AttendanceRecord = previous
      ? { ...previous, status, updated_at: new Date().toISOString() }
      : {
          id: `pending-attendance-${studentId}`,
          user_id: '',
          session_id: session.id,
          student_id: studentId,
          status,
          note: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

    setAttendance((current) => [
      ...current.filter((record) => record.student_id !== studentId),
      optimistic,
    ])
    setSavingAttendance((current) => [...current.filter((id) => id !== studentId), studentId])

    const result = await markAttendanceAction(session.id, studentId, status)
    setSavingAttendance((current) => current.filter((id) => id !== studentId))
    if (result.error || !result.data) {
      setAttendance((current) => [
        ...current.filter((record) => record.student_id !== studentId),
        ...(previous ? [previous] : []),
      ])
      setError(result.error ?? 'Impossible d’enregistrer cette présence.')
      showToast(result.error ?? 'Impossible d’enregistrer cette présence.', 'error')
      return
    }
    setAttendance((current) => [
      ...current.filter((record) => record.student_id !== studentId),
      result.data!,
    ])
  }

  async function addParticipation(studentId: string, value: -1 | 1 | 2, label: string) {
    setError(null)
    optimisticEventId.current += 1
    const temporaryId = `pending-participation-${optimisticEventId.current}`
    const optimistic: ParticipationEvent = {
      id: temporaryId,
      user_id: '',
      session_id: session.id,
      student_id: studentId,
      value,
      label,
      created_at: new Date().toISOString(),
    }
    setParticipation((current) => [...current, optimistic])

    const result = await addParticipationAction(session.id, studentId, value, label)
    if (result.error || !result.data) {
      setParticipation((current) => current.filter((event) => event.id !== temporaryId))
      setError(result.error ?? 'Impossible d’enregistrer cette participation.')
      showToast(result.error ?? 'Impossible d’enregistrer cette participation.', 'error')
      return
    }
    setParticipation((current) =>
      current.map((event) => (event.id === temporaryId ? result.data! : event))
    )
  }

  async function saveObservation() {
    if (!session || !selectedStudent) return

    setError(null)
    setIsSavingObservation(true)
    const result = await addObservationAction({
      sessionId: session.id,
      studentId: selectedStudent.id,
      category: selectedTag.category,
      tag: selectedTag.tag,
      note,
    })
    if (!result.error && result.data) {
      setObservations((current) => [...current, result.data!])
      setSelectedStudent(null)
      setNote('')
      showToast('Observation enregistrée.', 'success')
      setIsSavingObservation(false)
      return
    }
    setError(result.error ?? 'Impossible d’enregistrer cette observation.')
    showToast(result.error ?? 'Impossible d’enregistrer cette observation.', 'error')
    setIsSavingObservation(false)
  }

  async function closeSession() {
    setIsClosing(true)
    const result = await closeClassSessionAction(session.id, classId)
    setIsClosing(false)
    if (result.error) {
      setError(result.error)
      showToast(result.error, 'error')
      return
    }
    router.push(`/classroom/${classId}`)
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
          <SummaryBadge label="Presents" value={summary.present} color="text-emerald-700 dark:text-emerald-300" />
          <SummaryBadge label="Retards" value={summary.late} color="text-amber-700 dark:text-amber-300" />
          <SummaryBadge label="Absents" value={summary.absent} color="text-rose-700 dark:text-rose-300" />
          <SummaryBadge label="Notes" value={observations.length} color="text-sky-700 dark:text-sky-300" />
        </div>
      </section>

      {error && (
        <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
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
                        disabled={savingAttendance.includes(student.id)}
                        className={`flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold transition-colors ${
                          active ? className : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                        } disabled:opacity-70`}
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
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                  >
                    <Plus size={15} /> Active
                  </button>
                  <button
                    onClick={() => addParticipation(student.id, 2, 'Participation forte')}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-violet-500/30 bg-violet-500/10 text-sm font-semibold text-violet-700 dark:text-violet-300"
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
          <Button variant="outline" onClick={closeSession} disabled={isClosing}>
            {isClosing ? 'Clôture...' : 'Terminer la session'}
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
