export interface RawBatchCopyInput {
  studentId: string
  contentText: string
}

// Les eleves sans copie renseignee sont ignores plutot que de bloquer tout le
// lot (US-5) : on retire les entrees vides avant validation/persistance.
export function filterNonEmptyCopies(rawCopies: RawBatchCopyInput[]): RawBatchCopyInput[] {
  return rawCopies
    .map((copy) => ({ studentId: copy.studentId, contentText: copy.contentText.trim() }))
    .filter((copy) => copy.contentText.length > 0)
}
