import {
  getStudentContextInputSchema,
  saveStudentObservationInputSchema,
  type GetStudentContextInput,
  type SaveStudentObservationInput,
} from '../schemas/memorySchema.ts'
import type {
  OwnedStudentRecord,
  StudentAmbiguity,
  StudentAttendanceContext,
  StudentContentVariantContext,
  StudentContext,
  StudentContextResult,
  StudentObservationContext,
  StudentParticipationContext,
} from '../types/memory.types.ts'

export const RECENT_STUDENT_ACTIVITY_LIMIT = 25
export const RECENT_STUDENT_CONTENT_VARIANT_LIMIT = 10

type StudentContextErrorCode =
  | 'INVALID_INPUT'
  | 'AUTH_REQUIRED'
  | 'UNAUTHORIZED_STUDENT'
  | 'CONTEXT_LOOKUP_FAILED'
  | 'OBSERVATION_SAVE_FAILED'

export interface StudentContextRepository {
  listOwnedStudents(userId: string): Promise<OwnedStudentRecord[]>
  listRecentObservations(
    userId: string,
    studentId: string,
    limit: number
  ): Promise<StudentObservationContext[]>
  listRecentParticipations(
    userId: string,
    studentId: string,
    limit: number
  ): Promise<StudentParticipationContext[]>
  listRecentAttendance(
    userId: string,
    studentId: string,
    limit: number
  ): Promise<StudentAttendanceContext[]>
  listRecentContentVariants(
    userId: string,
    studentId: string,
    limit: number
  ): Promise<StudentContentVariantContext[]>
  studentBelongsToUser(userId: string, studentId: string): Promise<boolean>
  insertObservation(
    userId: string,
    studentId: string,
    contenu: string
  ): Promise<StudentObservationContext>
}

export class StudentContextError extends Error {
  readonly code: StudentContextErrorCode

  constructor(code: StudentContextErrorCode) {
    super(code)
    this.name = 'StudentContextError'
    this.code = code
  }
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function candidateNames(student: OwnedStudentRecord): string[] {
  return [student.firstName, student.lastName, student.fullName].map(normalizeName)
}

function toAmbiguity(students: OwnedStudentRecord[]): StudentAmbiguity {
  return {
    kind: 'ambiguous',
    candidates: students.map(({ id, firstName, lastName, fullName, classes }) => ({
      id,
      firstName,
      lastName,
      fullName,
      classes,
    })),
  }
}

function resolveStudent(
  students: OwnedStudentRecord[],
  rawQuery: string
): OwnedStudentRecord | StudentAmbiguity | null {
  const query = normalizeName(rawQuery)
  const exactMatches = students.filter((student) => candidateNames(student).includes(query))

  if (exactMatches.length === 1) return exactMatches[0]
  if (exactMatches.length > 1) return toAmbiguity(exactMatches)

  const partialMatches = students.filter((student) =>
    candidateNames(student).some((name) => name.includes(query))
  )

  if (partialMatches.length === 1) return partialMatches[0]
  if (partialMatches.length > 1) return toAmbiguity(partialMatches)
  return null
}

function keepMostRecentActivity(
  observations: StudentObservationContext[],
  participations: StudentParticipationContext[],
  attendance: StudentAttendanceContext[]
) {
  const selected = new Set(
    [
      ...observations.map(({ id, createdAt }) => ({ key: `observation:${id}`, createdAt })),
      ...participations.map(({ id, createdAt }) => ({ key: `participation:${id}`, createdAt })),
      ...attendance.map(({ id, updatedAt }) => ({ key: `attendance:${id}`, createdAt: updatedAt })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_STUDENT_ACTIVITY_LIMIT)
      .map(({ key }) => key)
  )

  return {
    observations: observations.filter(({ id }) => selected.has(`observation:${id}`)),
    participations: participations.filter(({ id }) => selected.has(`participation:${id}`)),
    attendance: attendance.filter(({ id }) => selected.has(`attendance:${id}`)),
  }
}

export async function getStudentContextCore(
  input: GetStudentContextInput,
  trustedUserId: string,
  repository: StudentContextRepository
): Promise<StudentContextResult> {
  const parsed = getStudentContextInputSchema.safeParse(input)
  if (!parsed.success || !trustedUserId) {
    throw new StudentContextError('INVALID_INPUT')
  }

  let students: OwnedStudentRecord[]
  try {
    students = await repository.listOwnedStudents(trustedUserId)
  } catch {
    throw new StudentContextError('CONTEXT_LOOKUP_FAILED')
  }

  const resolution = resolveStudent(students, parsed.data.studentQuery)
  if (!resolution || 'kind' in resolution) return resolution

  try {
    const [observations, participations, attendance, contentVariants] = await Promise.all([
      repository.listRecentObservations(
        trustedUserId,
        resolution.id,
        RECENT_STUDENT_ACTIVITY_LIMIT
      ),
      repository.listRecentParticipations(
        trustedUserId,
        resolution.id,
        RECENT_STUDENT_ACTIVITY_LIMIT
      ),
      repository.listRecentAttendance(
        trustedUserId,
        resolution.id,
        RECENT_STUDENT_ACTIVITY_LIMIT
      ),
      repository.listRecentContentVariants(
        trustedUserId,
        resolution.id,
        RECENT_STUDENT_CONTENT_VARIANT_LIMIT
      ),
    ])

    const recentActivity = keepMostRecentActivity(observations, participations, attendance)
    const { classes, ...student } = resolution
    const context: StudentContext = {
      kind: 'context',
      student,
      classes,
      observations: recentActivity.observations,
      participations: recentActivity.participations,
      attendance: recentActivity.attendance,
      contentVariants,
    }
    return context
  } catch {
    throw new StudentContextError('CONTEXT_LOOKUP_FAILED')
  }
}

export async function saveStudentObservationCore(
  input: SaveStudentObservationInput,
  trustedUserId: string,
  repository: StudentContextRepository
): Promise<StudentObservationContext> {
  const parsed = saveStudentObservationInputSchema.safeParse(input)
  if (!parsed.success || !trustedUserId) {
    throw new StudentContextError('INVALID_INPUT')
  }

  let belongsToUser: boolean
  try {
    belongsToUser = await repository.studentBelongsToUser(
      trustedUserId,
      parsed.data.studentId
    )
  } catch {
    throw new StudentContextError('CONTEXT_LOOKUP_FAILED')
  }

  if (!belongsToUser) {
    throw new StudentContextError('UNAUTHORIZED_STUDENT')
  }

  try {
    return await repository.insertObservation(
      trustedUserId,
      parsed.data.studentId,
      parsed.data.contenu
    )
  } catch {
    throw new StudentContextError('OBSERVATION_SAVE_FAILED')
  }
}
