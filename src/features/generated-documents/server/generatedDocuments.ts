import 'server-only'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { PATSchema, type PAT } from '@/features/agent/schemas/patSchema'
import type { ContentLanguage } from '@/features/i18n/locale'
import type {
  GeneratedDocumentHistoryItem,
  StoredGeneratedDocument,
} from '@/features/generated-documents/types/generatedDocument.types'

interface PATRow {
  id: string
  student_id: string
  class_id: string | null
  language: string
  pat: unknown
  created_at: string
}

interface PATWithStudentRow extends PATRow {
  student_profiles: { first_name: string; last_name: string } | Array<{ first_name: string; last_name: string }> | null
}

interface BulletinRow {
  id: string
  student_id: string | null
  student_name: string
  class_id: string | null
  subject: string
  grade: string
  observations: string | null
  tone: 'bienveillant' | 'encourageant' | 'factuel'
  comment: string
  created_at: string
}

function parseLanguage(value: string): ContentLanguage {
  return value === 'en' || value === 'es' ? value : 'fr'
}

function toPATDocument(row: PATRow): StoredGeneratedDocument | null {
  const parsed = PATSchema.safeParse(row.pat)
  if (!parsed.success) return null
  return {
    documentType: 'pat',
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    language: parseLanguage(row.language),
    pat: parsed.data,
    createdAt: row.created_at,
  }
}

function toBulletinDocument(row: BulletinRow): StoredGeneratedDocument | null {
  return {
    documentType: 'bulletin',
    id: row.id,
    studentId: row.student_id ?? `legacy:${row.student_name}`,
    studentName: row.student_name,
    classId: row.class_id,
    subject: row.subject,
    grade: row.grade,
    ...(row.observations ? { observations: row.observations } : {}),
    tone: row.tone,
    comment: row.comment,
    createdAt: row.created_at,
  }
}

export async function saveAgentPATGeneration(record: {
  studentId: string
  classId: string | null
  language: ContentLanguage
  pat: PAT
}): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error('AUTH_REQUIRED')
  const pat = PATSchema.parse(record.pat)
  const supabase = await createClient()
  const { error } = await supabase.from('pat_generations').insert({
    user_id: user.id,
    student_id: record.studentId,
    class_id: record.classId,
    language: record.language,
    pat,
  })
  if (error) {
    console.error('[generated-documents] enregistrement du PAT refusé', error)
    throw new Error('PAT_SAVE_FAILED')
  }
  revalidatePath('/history/documents')
  revalidatePath('/history')
}

export async function findLatestGeneratedDocument(
  trustedUserId: string,
  studentId: string,
  documentType: 'pat' | 'bulletin'
): Promise<StoredGeneratedDocument | null> {
  const user = await getCurrentUser()
  if (!user || user.id !== trustedUserId) throw new Error('AUTH_REQUIRED')
  const supabase = await createClient()

  if (documentType === 'pat') {
    const { data, error } = await supabase
      .from('pat_generations')
      .select('id, student_id, class_id, language, pat, created_at')
      .eq('user_id', user.id)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data ? toPATDocument(data as PATRow) : null
  }

  const { data, error } = await supabase
    .from('bulletin_comments')
    .select('id, student_id, student_name, class_id, subject, grade, observations, tone, comment, created_at')
    .eq('user_id', user.id)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? toBulletinDocument(data as BulletinRow) : null
}

export async function listMyGeneratedDocuments(): Promise<GeneratedDocumentHistoryItem[]> {
  const user = await getCurrentUser()
  if (!user) return []
  const supabase = await createClient()
  const [patResult, bulletinResult] = await Promise.all([
    supabase
      .from('pat_generations')
      .select('id, student_id, class_id, language, pat, created_at, student_profiles!inner(first_name, last_name)')
      .eq('user_id', user.id)
      .eq('student_profiles.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('bulletin_comments')
      .select('id, student_id, student_name, class_id, subject, grade, observations, tone, comment, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])
  if (patResult.error || bulletinResult.error) {
    console.error('[generated-documents] chargement de l’historique refusé', patResult.error ?? bulletinResult.error)
    throw new Error('GENERATED_DOCUMENT_HISTORY_FAILED')
  }

  const pats = (patResult.data ?? []).flatMap((raw) => {
    const row = raw as unknown as PATWithStudentRow
    const document = toPATDocument(row)
    const student = Array.isArray(row.student_profiles) ? row.student_profiles[0] : row.student_profiles
    if (!document || document.documentType !== 'pat' || !student) return []
    return [{ ...document, studentName: `${student.first_name} ${student.last_name}`.trim() }]
  })
  const bulletins = (bulletinResult.data ?? []).flatMap((row) => {
    const document = toBulletinDocument(row as BulletinRow)
    return document?.documentType === 'bulletin' ? [document] : []
  })

  return [...pats, ...bulletins].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
