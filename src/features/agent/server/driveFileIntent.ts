// Filtre sans appel IA : le message demande-t-il d'utiliser un fichier du
// Google Drive de l'enseignant ? Il faut à la fois une mention de Drive et un
// mot qui désigne un document. Mots entiers uniquement, pour ne pas réagir à
// une question générale (« comment fonctionne Google Drive depuis mon
// téléphone ? ») ni à des sous-chaînes (« profile » contient « file »).
const DRIVE_MENTION = /\b(?:google\s+drive|drive)\b/iu

const DOCUMENT_WORDS =
  /\b(?:documents?|fichiers?|gabarits?|mod[eè]les?|lettres?|exercices?|templates?|archivos?|plantillas?)\b/iu

export function looksLikeDriveFileRequest(message: string): boolean {
  return DRIVE_MENTION.test(message) && DOCUMENT_WORDS.test(message)
}
