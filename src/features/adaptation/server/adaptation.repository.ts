import 'server-only'

import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/features/profile/server/profile'
import { resolveStudentVariant } from '@/features/adaptation/utils/resolveStudentNeeds'
import type {
  AdaptationDetail,
  AdaptationListItem,
  AdaptationSourceOption,
  AdaptationStudentOption,
  SharedAdaptation,
} from '@/features/adaptation/types/adaptation.types'
import type { VariantType } from '@/features/adaptation/schemas/adaptationSchema'

const VARIANT_ORDER: VariantType[] = ['standard', 'support', 'dys', 'adhd', 'enrichment']

export interface AdaptationBuilderData {
  sources: AdaptationSourceOption[]
  students: AdaptationStudentOption[]
}

export async function listAdaptationBuilderData(): Promise<AdaptationBuilderData> {
  const user = await getCurrentUser()
  if (!user) return { sources: [], students: [] }

  const supabase = await createClient()
  const [coursesResult, documentsResult, classesResult, studentsResult] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, subject, level, created_at')
      .eq('user_id', user.id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false }),
    supabase
      .from('source_documents')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('classes')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('class_students')
      .select(
        'class_id, student_id, student_profiles!inner(id, first_name, last_name, needs, intervention_plan)'
      )
      .eq('user_id', user.id),
  ])

  const error =
    coursesResult.error ??
    documentsResult.error ??
    classesResult.error ??
    studentsResult.error

  if (error) {
    console.error('[adaptation] chargement des options refusé', error)
    throw new Error('Impossible de charger les cours, documents et élèves.')
  }

  const classNames = new Map(
    (classesResult.data ?? []).map((classroom) => [classroom.id as string, classroom.name as string])
  )

  const sources: AdaptationSourceOption[] = [
    ...(coursesResult.data ?? []).map((course) => ({
      id: course.id as string,
      type: 'course' as const,
      title: course.title as string,
      subject: course.subject as string,
      level: course.level as string,
      createdAt: course.created_at as string,
    })),
    ...(documentsResult.data ?? []).map((document) => ({
      id: document.id as string,
      type: 'document' as const,
      title: document.title as string,
      createdAt: document.created_at as string,
    })),
  ]

  const students: AdaptationStudentOption[] = (studentsResult.data ?? [])
    .map((row) => {
      const rawProfile = row.student_profiles
      const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile
      if (!profile) return null

      const needs = Array.isArray(profile.needs)
        ? profile.needs.filter((value): value is string => typeof value === 'string')
        : []
      const interventionPlan = Boolean(profile.intervention_plan)

      return {
        id: profile.id as string,
        classId: row.class_id as string,
        className: classNames.get(row.class_id as string) ?? 'Classe',
        firstName: profile.first_name as string,
        lastName: profile.last_name as string,
        needs,
        interventionPlan,
        suggestedVariant: resolveStudentVariant(needs, interventionPlan),
      }
    })
    .filter((student): student is AdaptationStudentOption => Boolean(student))
    .sort((a, b) =>
      `${a.className}${a.lastName}${a.firstName}`.localeCompare(
        `${b.className}${b.lastName}${b.firstName}`,
        'fr'
      )
    )

  return { sources, students }
}

export async function listMyAdaptations(): Promise<AdaptationListItem[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('adaptation_sets')
    .select(
      'id, title, subject, level, source_type, status, created_at, adaptation_variants(id, status)'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[adaptation] chargement de la banque refusé', error)
    throw new Error('Impossible de charger les adaptations.')
  }

  return (data ?? []).map((item) => {
    const variants = Array.isArray(item.adaptation_variants)
      ? item.adaptation_variants
      : []
    return {
      id: item.id as string,
      title: item.title as string,
      subject: item.subject as string,
      level: item.level as string,
      sourceType: item.source_type as AdaptationListItem['sourceType'],
      status: item.status as AdaptationListItem['status'],
      createdAt: item.created_at as string,
      completedVariants: variants.filter((variant) => variant.status === 'complete').length,
      totalVariants: variants.length,
    }
  })
}

export async function getMyAdaptation(id: string): Promise<AdaptationDetail | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('adaptation_sets')
    .select(`
      *,
      adaptation_variants(*),
      adaptation_students(
        id,
        student_id,
        suggested_variant,
        student_profiles(first_name, last_name)
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[adaptation] chargement du détail refusé', error)
    throw new Error('Impossible de charger cette adaptation.')
  }
  if (!data) return null

  const rawVariants = Array.isArray(data.adaptation_variants)
    ? data.adaptation_variants
    : []
  const variants = [...rawVariants].sort(
    (a, b) =>
      VARIANT_ORDER.indexOf(a.variant_type as VariantType) -
      VARIANT_ORDER.indexOf(b.variant_type as VariantType)
  )

  const students = (Array.isArray(data.adaptation_students)
    ? data.adaptation_students
    : []
  ).map((link: {
    id: unknown
    student_id: unknown
    suggested_variant: unknown
    student_profiles:
      | { first_name?: unknown; last_name?: unknown }
      | Array<{ first_name?: unknown; last_name?: unknown }>
      | null
  }) => {
    const rawProfile = link.student_profiles
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile
    return {
      id: link.id as string,
      studentId: link.student_id as string,
      firstName: (profile?.first_name as string) ?? 'Élève',
      lastName: (profile?.last_name as string) ?? '',
      suggestedVariant: link.suggested_variant as VariantType,
    }
  })

  return {
    ...data,
    variants,
    students,
  } as AdaptationDetail
}

export async function getSharedAdaptation(token: string): Promise<SharedAdaptation | null> {
  if (!/^[A-Za-z0-9_-]{32,200}$/.test(token)) return null

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_shared_adaptation', {
    p_token_hash: tokenHash,
  })

  if (error) {
    console.error('[adaptation:share] lecture du lien refusée', error)
    return null
  }

  return (data as SharedAdaptation | null) ?? null
}
