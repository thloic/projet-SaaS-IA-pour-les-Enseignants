import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { parseMarkdownToBlocks } from '@/features/export/utils/markdownToBlocks'
import type { ExportDocument } from '@/features/export/types/export.types'
import type { VariantType } from '@/features/adaptation/schemas/adaptationSchema'
import { getClassDashboardForUser } from '@/features/classroom/server/classroomDashboard'
import type { ClassroomPeriod } from '@/features/classroom/types/classroomDashboard.types'

const VARIANT_LABELS: Record<VariantType, string> = {
  standard: 'Standard',
  support: 'Soutien',
  dys: 'DYS',
  adhd: 'TDAH',
  enrichment: 'Enrichissement',
}

export async function loadCourseExportDocument(
  courseId: string,
  userId: string
): Promise<ExportDocument | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('title, subject, level, duration_minutes, content_md')
    .eq('id', courseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[export] lecture du cours refusée', error)
    throw new Error('COURSE_LOAD_FAILED')
  }
  if (!data || !data.content_md?.trim()) return null

  return {
    title: data.title,
    meta: [data.subject, data.level, `${data.duration_minutes} min`],
    blocks: parseMarkdownToBlocks(data.content_md),
    dysLayout: false,
  }
}

export async function loadAdaptationVariantExportDocument(
  adaptationSetId: string,
  variantType: VariantType,
  userId: string
): Promise<ExportDocument | null> {
  const supabase = await createClient()
  const { data: adaptationSet, error: setError } = await supabase
    .from('adaptation_sets')
    .select('title, subject, level')
    .eq('id', adaptationSetId)
    .eq('user_id', userId)
    .maybeSingle()

  if (setError) {
    console.error('[export] lecture de l’adaptation refusée', setError)
    throw new Error('ADAPTATION_LOAD_FAILED')
  }
  if (!adaptationSet) return null

  const { data: variant, error: variantError } = await supabase
    .from('adaptation_variants')
    .select('content_md, status')
    .eq('adaptation_set_id', adaptationSetId)
    .eq('variant_type', variantType)
    .eq('user_id', userId)
    .maybeSingle()

  if (variantError) {
    console.error('[export] lecture de la variante refusée', variantError)
    throw new Error('VARIANT_LOAD_FAILED')
  }
  if (!variant || variant.status !== 'complete' || !variant.content_md?.trim()) return null

  return {
    title: adaptationSet.title,
    meta: [adaptationSet.subject, adaptationSet.level, VARIANT_LABELS[variantType]],
    blocks: parseMarkdownToBlocks(variant.content_md),
    dysLayout: variantType === 'dys',
  }
}

const PERIOD_LABELS: Record<ClassroomPeriod, string> = {
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
}

export async function loadClassroomExportDocument(
  classId: string,
  userId: string,
  options: {
    period: ClassroomPeriod
    includeNames: boolean
    includeObservations: boolean
  }
): Promise<ExportDocument | null> {
  const data = await getClassDashboardForUser(classId, options.period, userId)
  if (!data || data.classroom.user_id !== userId) return null

  const studentLabels = new Map(
    data.students.map((student, index) => [
      student.id,
      options.includeNames
        ? `${student.firstName} ${student.lastName}`
        : `Élève ${String(index + 1).padStart(2, '0')}`,
    ])
  )
  const distributionRows = data.attendanceDistribution.map((item) => [
    item.label,
    String(item.value),
  ])
  const sessionRows = data.sessions.map((session) => [
    new Date(`${session.date}T12:00:00`).toLocaleDateString('fr-FR'),
    String(session.presentCount),
    String(session.lateCount),
    String(session.absenceCount),
    String(session.participationEvents),
    String(session.observationCount),
  ])
  const studentRows = data.students.map((student) => [
    studentLabels.get(student.id) ?? 'Élève',
    student.attendanceRate === null ? 'Non disponible' : `${student.attendanceRate} %`,
    String(student.lateCount),
    String(student.absenceCount),
    String(student.participationEvents),
    student.signals[0] ?? 'Aucun signal factuel',
  ])

  const blocks: ExportDocument['blocks'] = [
    { type: 'heading1', text: 'Synthèse de la classe' },
    {
      type: 'paragraph',
      text: `${data.metrics.studentCount} élèves, ${data.metrics.sessionCount} séances et un taux de présence de ${
        data.metrics.attendanceRate === null ? 'non disponible' : `${data.metrics.attendanceRate} %`
      } sur la période sélectionnée.`,
    },
    { type: 'heading1', text: 'Répartition des présences' },
    { type: 'table', headers: ['Statut', 'Total'], rows: distributionRows },
    { type: 'heading1', text: 'Activité par séance' },
    {
      type: 'table',
      headers: ['Date', 'Présents', 'Retards', 'Absents', 'Participations', 'Observations'],
      rows: sessionRows.length > 0 ? sessionRows : [['Aucune séance', '0', '0', '0', '0', '0']],
    },
    { type: 'heading1', text: 'Suivi des élèves' },
    {
      type: 'table',
      headers: ['Élève', 'Présence', 'Retards', 'Absences', 'Participations', 'Fait à vérifier'],
      rows:
        studentRows.length > 0
          ? studentRows
          : [['Aucun élève', '—', '0', '0', '0', '—']],
    },
  ]

  if (options.includeObservations) {
    blocks.push(
      { type: 'heading1', text: 'Observations récentes' },
      {
        type: 'table',
        headers: ['Élève', 'Catégorie', 'Observation', 'Date'],
        rows:
          data.recentObservations.length > 0
            ? data.recentObservations.map((observation) => [
                studentLabels.get(observation.studentId) ?? 'Élève',
                observation.category,
                observation.note
                  ? `${observation.tag} — ${observation.note}`
                  : observation.tag,
                new Date(observation.createdAt).toLocaleDateString('fr-FR'),
              ])
            : [['Aucune observation', '—', '—', '—']],
      }
    )
  }

  blocks.push({
    type: 'paragraph',
    text: 'Ce rapport présente uniquement les données enregistrées par le professeur et ne constitue pas un diagnostic.',
  })

  return {
    title: `Rapport de classe — ${data.classroom.name}`,
    meta: [
      data.classroom.level,
      data.classroom.subject,
      PERIOD_LABELS[options.period],
      `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    ],
    blocks,
    dysLayout: false,
  }
}
