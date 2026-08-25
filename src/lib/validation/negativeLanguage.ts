// Regles partagees entre PAT et bulletin : un document destine a un eleve ou
// une famille ne doit jamais contenir de formulation negative directe — les
// difficultes se reformulent en besoins/axes de progres avant meme d'arriver
// ici (regle de prompt) ; ce filtre est le garde-fou de dernier recours.
export const NEGATIVE_DIRECT_PATTERNS = [
  /en\s+difficult[eé]/iu,
  /incapable/iu,
  /faible/iu,
  /[eé]choue/iu,
  /ne\s+[^.!?]{0,60}\s+pas/iu,
  /\b(?:unable|incapable|weak|fails?|cannot|can['’]?t|struggles?\s+with)\b/iu,
  /\b(?:incapaz|d[eé]bil|fracasa|no\s+puede|tiene\s+dificultades)\b/iu,
]

export function containsNegativeLanguage(texts: string[]): boolean {
  return texts.some((text) => NEGATIVE_DIRECT_PATTERNS.some((pattern) => pattern.test(text)))
}
