// Filtre bon marche (aucun appel IA) : le message demande-t-il de chercher dans
// la boite mail de l'enseignant ? Sert de garde-fou AVANT le modele : si
// Gmail n'est pas connecte, la carte de connexion part directement, sans
// dependre du fait que le modele appelle l'outil (il peut repondre en texte
// seul, sans bouton).
//
// Le mot « courriel » seul ne suffit PAS : il sert aussi à rédiger un courriel
// aux parents (parentEmailIntent). Un verbe de recherche ou le nom « Gmail »
// est donc exigé, et toute mention de parents/famille écarte le filtre.
const GMAIL_READ_KEYWORDS = [
  /gmail/iu,
  /bo[iî]te\s+(?:de\s+)?(?:r[ée]ception|mail|courriel)/iu,
  /(?:cherche|trouve|recherche|retrouve|regarde|v[ée]rifie|lis|lire).{0,40}\b(?:e-?mails?|courriels?|mails?|messages?)\b/iu,
  /re[çc]u.{0,30}\b(?:e-?mails?|courriels?|mails?)\b/iu,
]

const PARENT_OR_FAMILY_WORDS = /parents?|famille|maman|papa|padres?/iu

export function looksLikeGmailReadRequest(message: string): boolean {
  if (PARENT_OR_FAMILY_WORDS.test(message)) return false
  return GMAIL_READ_KEYWORDS.some((pattern) => pattern.test(message))
}
