// Filtre bon marche (aucun appel IA) qui decide si un message ressemble a une
// demande de compte rendu de rencontre parent, avant de declencher
// l'extraction structuree (couteuse) dans meetingSummaryExtractionModel.ts.
// Permissif par design (lecon tiree de parentEmailIntent.ts) : le mot
// "rencontre"/"meeting" seul avec "parent(s)" suffit, sans exiger une
// formulation exacte ni le mot "compte rendu".
const MEETING_SUMMARY_KEYWORDS = [
  /compte[\s-]rendu/iu,
  /rencontre.{0,30}parents?/iu,
  /parents?.{0,30}rencontre/iu,
  /r[ée]union.{0,30}parents?/iu,
  /parents?.{0,30}r[ée]union/iu,
  /entretien.{0,30}parents?/iu,
  /parents?.{0,30}entretien/iu,
  /meeting.{0,30}parents?/iu,
  /parents?.{0,30}meeting/iu,
  /reuni[oó]n.{0,30}padres/iu,
  /padres.{0,30}reuni[oó]n/iu,
  /entrevista.{0,30}padres/iu,
]

export function looksLikeMeetingSummaryRequest(message: string): boolean {
  return MEETING_SUMMARY_KEYWORDS.some((pattern) => pattern.test(message))
}
