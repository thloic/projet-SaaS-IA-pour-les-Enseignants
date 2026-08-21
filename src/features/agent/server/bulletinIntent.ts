// Filtre bon marche (aucun appel IA) qui decide si un message ressemble a une
// demande de commentaire de bulletin, avant de declencher l'extraction
// structuree (couteuse) dans bulletinExtraction.ts.
const BULLETIN_KEYWORDS = [
  /bulletin/iu,
  /commentaire\s+de\s+bulletin/iu,
  /report\s*card/iu,
  /bolet[ií]n/iu,
  /comentario\s+de\s+bolet[ií]n/iu,
]

export function looksLikeBulletinRequest(message: string): boolean {
  return BULLETIN_KEYWORDS.some((pattern) => pattern.test(message))
}
