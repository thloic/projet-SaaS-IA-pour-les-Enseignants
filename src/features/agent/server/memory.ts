import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import type {
  AttendanceRecord,
  ClassRoom,
  ParticipationEvent,
  StudentObservation,
  StudentProfile,
} from '@/features/classroom/types/classroom.types'
import type {
  GetStudentContextInput,
  SaveStudentObservationInput,
} from '@/features/agent/schemas/memorySchema'
import {
  getStudentContextCore,
  saveStudentObservationCore,
  StudentContextError,
  type StudentContextRepository,
} from '@/features/agent/server/studentContextCore'
import type {
  OwnedStudentRecord,
  StudentContentVariantContext,
  StudentContextResult,
  StudentObservationContext,
} from '@/features/agent/types/memory.types'

interface StudentLinkRow {
  student_profiles: StudentProfile | StudentProfile[] | null
  classes: ClassRoom | ClassRoom[] | null
}

interface AdaptationSetRow {
  id: string
  title: string
  subject: string
  level: string
}

interface AdaptationLinkRow {
  id: string
  adaptation_set_id: string
  suggested_variant: StudentContentVariantContext['suggestedVariant']
  created_at: string
  adaptation_sets: AdaptationSetRow | AdaptationSetRow[] | null
}

function singleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function toObservationContext(observation: StudentObservation): StudentObservationContext {
  return {
    id: observation.id,
    sessionId: observation.session_id,
    category: observation.category,
    tag: observation.tag,
    note: observation.note,
    createdAt: observation.created_at,
  }
}

async function createRepository(): Promise<StudentContextRepository> {
  const supabase = await createClient()

  return {
    async listOwnedStudents(userId) {
      const { data, error } = await supabase
        .from('class_students')
        .select('student_profiles!inner(*), classes!inner(*)')
        .eq('user_id', userId)
        .eq('student_profiles.user_id', userId)
        .eq('classes.user_id', userId)

      if (error) {
        console.error('[agent:student-context] chargement des élèves refusé', error)
        throw new Error('STUDENT_LIST_FAILED')
      }

      const studentsById = new Map<string, OwnedStudentRecord>()
      for (const rawLink of data ?? []) {
        const link = rawLink as unknown as StudentLinkRow
        const profile = singleRelation(link.student_profiles)
        const classroom = singleRelation(link.classes)
        if (!profile || !classroom) continue

        const existing = studentsById.get(profile.id)
        const classContext = {
          id: classroom.id,
          name: classroom.name,
          level: classroom.level,
          subject: classroom.subject,
        }

        if (existing) {
          if (!existing.classes.some(({ id }) => id === classroom.id)) {
            existing.classes.push(classContext)
          }
          continue
        }

        studentsById.set(profile.id, {
          id: profile.id,
          firstName: profile.first_name,
          lastName: profile.last_name,
          fullName: `${profile.first_name} ${profile.last_name}`.trim(),
          sex: profile.sex,
          familyLanguage: profile.family_language,
          needs: profile.needs ?? [],
          institutionalAdaptations: profile.institutional_adaptations ?? [],
          interventionPlan: profile.intervention_plan,
          generalNotes: profile.general_notes,
          classes: [classContext],
        })
      }

      return [...studentsById.values()].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, 'fr')
      )
    },

    async listRecentObservations(userId, studentId, limit) {
      const { data, error } = await supabase
        .from('student_observations')
        .select('*')
        .eq('user_id', userId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('[agent:student-context] chargement des observations refusé', error)
        throw new Error('OBSERVATION_LIST_FAILED')
      }

      return ((data ?? []) as StudentObservation[]).map(toObservationContext)
    },

    async listRecentParticipations(userId, studentId, limit) {
      const { data, error } = await supabase
        .from('participation_events')
        .select('*')
        .eq('user_id', userId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('[agent:student-context] chargement des participations refusé', error)
        throw new Error('PARTICIPATION_LIST_FAILED')
      }

      return ((data ?? []) as ParticipationEvent[]).map((event) => ({
        id: event.id,
        sessionId: event.session_id,
        value: event.value,
        label: event.label,
        createdAt: event.created_at,
      }))
    },

    async listRecentAttendance(userId, studentId, limit) {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('[agent:student-context] chargement des présences refusé', error)
        throw new Error('ATTENDANCE_LIST_FAILED')
      }

      return ((data ?? []) as AttendanceRecord[]).map((record) => ({
        id: record.id,
        sessionId: record.session_id,
        status: record.status,
        note: record.note,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      }))
    },

    async listRecentContentVariants(userId, studentId, limit) {
      const { data, error } = await supabase
        .from('adaptation_students')
        .select('id, adaptation_set_id, suggested_variant, created_at, adaptation_sets!inner(id, title, subject, level)')
        .eq('user_id', userId)
        .eq('student_id', studentId)
        .eq('adaptation_sets.user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('[agent:student-context] chargement des variantes de contenu refusé', error)
        throw new Error('CONTENT_VARIANT_LIST_FAILED')
      }

      return (data ?? []).flatMap((rawLink) => {
        const link = rawLink as unknown as AdaptationLinkRow
        const adaptationSet = singleRelation(link.adaptation_sets)
        if (!adaptationSet) return []
        return [
          {
            id: link.id,
            adaptationSetId: link.adaptation_set_id,
            title: adaptationSet.title,
            subject: adaptationSet.subject,
            level: adaptationSet.level,
            suggestedVariant: link.suggested_variant,
            createdAt: link.created_at,
          },
        ]
      })
    },

    async studentBelongsToUser(userId, studentId) {
      const { data, error } = await supabase
        .from('class_students')
        .select('student_id, student_profiles!inner(id), classes!inner(id)')
        .eq('user_id', userId)
        .eq('student_id', studentId)
        .eq('student_profiles.user_id', userId)
        .eq('classes.user_id', userId)
        .limit(1)

      if (error) {
        console.error('[agent:student-context] vérification de l’élève refusée', error)
        throw new Error('STUDENT_OWNERSHIP_FAILED')
      }

      return Boolean(data?.[0])
    },

    async insertObservation(userId, studentId, contenu) {
      const { data, error } = await supabase
        .from('student_observations')
        .insert({
          user_id: userId,
          student_id: studentId,
          session_id: null,
          category: 'other',
          tag: 'Observation agent',
          note: contenu,
        })
        .select('*')
        .single()

      if (error || !data) {
        console.error('[agent:student-context] enregistrement de l’observation refusé', error)
        throw new Error('OBSERVATION_INSERT_FAILED')
      }

      return toObservationContext(data as StudentObservation)
    },
  }
}

async function getTrustedUserId(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new StudentContextError('AUTH_REQUIRED')
  return user.id
}

export async function getStudentContext(
  input: GetStudentContextInput
): Promise<StudentContextResult> {
  const userId = await getTrustedUserId()
  return getStudentContextCore(input, userId, await createRepository())
}

export async function saveStudentObservation(
  input: SaveStudentObservationInput
): Promise<StudentObservationContext> {
  const userId = await getTrustedUserId()
  return saveStudentObservationCore(input, userId, await createRepository())
}
