import type { CorrectionCopyStatus, CorrectionFinding } from '../types/correction.types'
import type { CorrectionFindingCategory } from '../schemas/correctionSchema'

export interface CorrectionBatchRecapCategory {
  category: CorrectionFindingCategory
  count: number
}

export interface CorrectionBatchRecap {
  status: 'available' | 'no_data'
  validatedCount: number
  categories: CorrectionBatchRecapCategory[]
}

export interface CorrectionRecapCopy {
  status: CorrectionCopyStatus
  findings: CorrectionFinding[]
}

// Compte, par categorie, le nombre de copies distinctes concernees (US-15 :
// « combien d'eleves sont concernes »), pas le nombre brut d'erreurs — une
// copie avec 3 erreurs de syntaxe ne compte qu'une fois dans « syntaxe ».
// Seules les copies validees par l'enseignant sont comptees.
export function buildCorrectionBatchRecap(copies: CorrectionRecapCopy[]): CorrectionBatchRecap {
  const validated = copies.filter((copy) => copy.status === 'validated')
  if (validated.length === 0) return { status: 'no_data', validatedCount: 0, categories: [] }

  const counts = new Map<CorrectionFindingCategory, number>()
  for (const copy of validated) {
    const categoriesInCopy = new Set(copy.findings.map((finding) => finding.category))
    for (const category of categoriesInCopy) {
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
  }

  const categories = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  return { status: 'available', validatedCount: validated.length, categories }
}
