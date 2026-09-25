const EXPLICIT_OBSERVATION_PATTERNS = [
  /\b(?:note|notes|notez)\s+(?:que|l['’]observation|ceci|cela)\b/u,
  /\b(?:enregistre|enregistres|enregistrez|ajoute|ajoutes|ajoutez|consigne|consignes)\s+(?:que|une\s+observation|ceci|cela)\b/u,
  /\b(?:record|save|log)\s+(?:that|this|an\s+observation)\b/u,
  /\b(?:anota|anote|registra|registre|guarda|guarde|agrega|agregue)\s+(?:que|esto|una\s+observaci[oó]n)\b/u,
]

const DAILY_OBSERVATION_PATTERN = /^(?:aujourd['’]hui|ce matin|cet apres midi|cet après-midi|pendant le cours|today|this morning|during class|hoy|esta manana|esta mañana|durante la clase)\b/u

export function looksLikeStudentObservation(message: string): boolean {
  const normalized = message.trim().toLocaleLowerCase('fr')
  return (
    EXPLICIT_OBSERVATION_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    DAILY_OBSERVATION_PATTERN.test(normalized)
  )
}

export function extractObservationContent(message: string): string {
  return message
    .trim()
    .replace(
      /^(?:peux-tu\s+|pourrais-tu\s+|merci\s+de\s+)?(?:note(?:z)?|enregistre(?:z)?|ajoute(?:z)?|consigne(?:z)?|record|save|log|anota|anote|registra|registre|guarda|guarde|agrega|agregue)(?:\s+(?:une\s+observation\s+|que\s+|that\s+|an\s+observation\s+|una\s+observaci[oó]n\s+)?)?[:\s-]*/iu,
      ''
    )
    .trim()
}
