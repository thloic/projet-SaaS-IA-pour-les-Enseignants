'use server'

import { listClassStudents } from '@/features/classroom/server/classroom.actions'
import { saveEvaluationResultsBatchAction } from '@/features/classroom/server/evaluationResults.actions'
import { parseEvaluationCsv, type SkippedEvaluationRow } from '@/features/classroom/server/evaluationCsvParsing'
import type { EvaluationResult } from '@/features/classroom/types/classroom.types'

const MAX_CSV_BYTES = 1024 * 1024

export type EvaluationCsvImportSkippedRow = SkippedEvaluationRow

export interface EvaluationCsvImportSavedRow extends EvaluationResult {
  studentName: string
}

export interface EvaluationCsvImportResult {
  error: string | null
  saved: EvaluationCsvImportSavedRow[]
  skipped: EvaluationCsvImportSkippedRow[]
}

export async function importClassEvaluationResultsCsvAction(
  classId: string,
  title: string,
  formData: FormData
): Promise<EvaluationCsvImportResult> {
  const file = formData.get('file')
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.csv')) {
    return { error: 'Le fichier doit être un CSV.', saved: [], skipped: [] }
  }
  if (file.size > MAX_CSV_BYTES) {
    return { error: 'Le fichier dépasse la taille maximale de 1 Mo.', saved: [], skipped: [] }
  }

  const students = await listClassStudents(classId)
  const text = await file.text()
  const { headerValid, rows, skipped } = parseEvaluationCsv(text, students)

  if (!headerValid) {
    return {
      error: 'L’en-tête du fichier doit être exactement « Nom complet,Note ». Téléchargez le modèle avant de le remplir.',
      saved: [],
      skipped: [],
    }
  }

  if (rows.length === 0) {
    return {
      error: skipped.length > 0 ? null : 'Aucune ligne exploitable dans ce fichier.',
      saved: [],
      skipped,
    }
  }

  const response = await saveEvaluationResultsBatchAction({
    classId,
    title: title || undefined,
    results: rows.map(({ studentId, grade }) => ({ studentId, grade })),
  })
  if (response.error || !response.data) {
    return { error: response.error ?? 'Impossible d’enregistrer ces résultats.', saved: [], skipped }
  }

  const namesById = new Map(
    students.map((student) => [student.id, `${student.first_name} ${student.last_name}`.trim()])
  )
  const saved = response.data.map((result) => ({
    ...result,
    studentName: namesById.get(result.student_id) ?? 'Élève',
  }))

  return { error: null, saved, skipped }
}
