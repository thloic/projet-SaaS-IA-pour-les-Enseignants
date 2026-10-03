// Filtre bon marche (aucun appel IA) qui decide si un message ressemble a une
// demande de courriel aux parents, avant de declencher l'extraction
// structuree (couteuse) dans parentEmailExtractionModel.ts. Meme principe que
// bulletinIntent.ts.
//
// "courriel"/"email"/"correo" sont des mots assez specifiques dans ce produit
// (aucune autre fonction ne genere un email) pour etre reconnus seuls, sans
// exiger le mot "parent(s)" a proximite : un enseignant dit naturellement
// "un courriel pour cet eleve" ou "un courriel avec observation de
// comportement" sans jamais ecrire "parent". "message"/"lettre"/"write to"
// sont trop generiques seuls et restent donc ancres au mot "parent(s)".
// `c[ou]{1,2}r+iel` tolere les coquilles frequentes sur "courriel" : lettre
// manquante parmi o/u ("couriel", "corriel") ou r en trop/en moins.
const PARENT_EMAIL_KEYWORDS = [
  /c[ou]{1,2}r+iel/iu,
  /e-?mail/iu,
  /correo/iu,
  /message.{0,30}parents?/iu,
  /parents?.{0,30}message/iu,
  /lettre.{0,30}parents?/iu,
  /parents?.{0,30}lettre/iu,
  /[eé]cri(?:re|s|t).{0,30}parents?/iu,
  /write\s*to\s*(?:the\s*)?parents?/iu,
  /message\s*to\s*(?:the\s*)?parents?/iu,
  /mensaje.{0,30}padres/iu,
  /padres.{0,30}mensaje/iu,
]

export function looksLikeParentEmailRequest(message: string): boolean {
  return PARENT_EMAIL_KEYWORDS.some((pattern) => pattern.test(message))
}
