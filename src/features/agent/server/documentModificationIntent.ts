const MODIFICATION_VERBS = [
  /\b(?:modifie|modifier|corrige|corriger|change|changer|ajuste|ajuster)\b/iu,
  /\b(?:modify|edit|update|change|revise)\b/iu,
  /\b(?:modifica|modificar|corrige|corregir|cambia|cambiar|actualiza|actualizar|ajusta|ajustar)\b/iu,
]

const DOCUMENT_WORDS = [
  /\bpat\b/iu,
  /plan\s+d['’ ]appui/iu,
  /support\s+plan/iu,
  /plan\s+de\s+apoyo/iu,
  /bulletin/iu,
  /report\s*card/iu,
  /bolet[ií]n/iu,
]

export function looksLikeDocumentModificationRequest(message: string): boolean {
  return MODIFICATION_VERBS.some((pattern) => pattern.test(message)) &&
    DOCUMENT_WORDS.some((pattern) => pattern.test(message))
}
