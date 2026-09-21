import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClassGradeRecord, CorrectionFindingRow } from './classContextCore.ts'

// The caller uses the authenticated SSR client; every query also scopes the owner explicitly.
export function createClassContextRepository(supabase: SupabaseClient) {
  return {
    async listOwnedClasses(userId: string) {
      if (!userId) throw new Error('AUTH_REQUIRED')
      const { data, error } = await supabase.from('classes').select('id, name, level, subject')
        .eq('user_id', userId).order('name')
      if (error) throw new Error('CLASS_LIST_FAILED')
      return data ?? []
    },
    async listEvaluationGrades(userId: string, classId: string): Promise<ClassGradeRecord[]> {
      if (!userId) throw new Error('AUTH_REQUIRED')
      const { data: ownedClass, error: ownershipError } = await supabase.from('classes').select('id')
        .eq('user_id', userId).eq('id', classId).maybeSingle()
      if (ownershipError) throw new Error('CLASS_LOOKUP_FAILED')
      if (!ownedClass) throw new Error('CLASS_NOT_FOUND')
      const rows: ClassGradeRecord[] = []
      // Fetch all pages so PostgREST's default cap never becomes a partial average.
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('evaluation_results')
          .select('student_id, title, grade').eq('user_id', userId).eq('class_id', classId)
          .order('id').range(offset, offset + 499)
        if (error) throw new Error('CLASS_EVALUATIONS_FAILED')
        rows.push(...(data ?? []))
        if (!data || data.length < 500) break
      }
      return rows
    },
    async listCorrectionFindings(userId: string, classId: string): Promise<CorrectionFindingRow[]> {
      if (!userId) throw new Error('AUTH_REQUIRED')
      const { data: ownedClass, error: ownershipError } = await supabase.from('classes').select('id')
        .eq('user_id', userId).eq('id', classId).maybeSingle()
      if (ownershipError) throw new Error('CLASS_LOOKUP_FAILED')
      if (!ownedClass) throw new Error('CLASS_NOT_FOUND')
      const rows: CorrectionFindingRow[] = []
      // Meme pagination defensive que listEvaluationGrades : le nombre de copies
      // d'une classe grandit avec les annees, ne pas se fier au plafond par defaut de PostgREST.
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('correction_copies')
          .select('status, validated_at, findings, correction_batches!inner(class_id)')
          .eq('user_id', userId).eq('correction_batches.class_id', classId)
          .order('id').range(offset, offset + 499)
        if (error) throw new Error('CLASS_CORRECTION_FINDINGS_FAILED')
        rows.push(...(data ?? []).map((row) => ({
          status: row.status as CorrectionFindingRow['status'],
          validated_at: row.validated_at,
          findings: row.findings as CorrectionFindingRow['findings'],
        })))
        if (!data || data.length < 500) break
      }
      return rows
    },
  }
}
