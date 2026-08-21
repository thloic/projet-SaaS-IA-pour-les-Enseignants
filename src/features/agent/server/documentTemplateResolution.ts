import type { StudentClassContext } from '../types/memory.types.ts'
import type { ResolvedDocumentTemplate, SelectedDocumentTemplate } from '../types/documentTemplate.types.ts'

// Un modele de document est obligatoire avant de generer un PAT ou un bulletin
// (decision produit : pas d'equivalent institutionnel fige hors Quebec, donc
// pas de generation "a l'aveugle"). Quand l'eleve appartient a plusieurs
// classes, on retient deterministement la premiere (ordre alphabetique) qui a
// un modele configure. Pour cette classe, un PDF televerse est prioritaire
// sur le texte colle si les deux sont presents.
export function selectDocumentTemplate(
  classes: StudentClassContext[]
): SelectedDocumentTemplate | null {
  const withTemplate = classes
    .filter(
      (classroom) =>
        Boolean(classroom.documentTemplatePath?.trim()) ||
        Boolean(classroom.documentTemplate?.trim())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  const first = withTemplate[0]
  if (!first) return null

  if (first.documentTemplatePath?.trim()) {
    return {
      source: 'pdf',
      path: first.documentTemplatePath.trim(),
      className: first.name,
      classId: first.id,
    }
  }

  return {
    source: 'text',
    content: first.documentTemplate!.trim(),
    className: first.name,
    classId: first.id,
  }
}

// Transforme le pointeur (texte ou chemin de fichier) en contenu pret pour la
// generation. La lecture du PDF est injectee (fetchPdfBase64) pour rester
// testable sans stockage reel.
export async function resolveDocumentTemplateContent(
  selected: SelectedDocumentTemplate,
  fetchPdfBase64: (path: string) => Promise<string>
): Promise<ResolvedDocumentTemplate> {
  if (selected.source === 'text') {
    return { kind: 'text', content: selected.content }
  }

  const base64 = await fetchPdfBase64(selected.path)
  return { kind: 'pdf', base64 }
}
