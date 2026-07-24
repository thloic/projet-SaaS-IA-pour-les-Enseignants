import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { parseMarkdownToBlocks } from '@/features/export/utils/markdownToBlocks'
import type { ExportDocument } from '@/features/export/types/export.types'
import type { VariantType } from '@/features/adaptation/schemas/adaptationSchema'

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
