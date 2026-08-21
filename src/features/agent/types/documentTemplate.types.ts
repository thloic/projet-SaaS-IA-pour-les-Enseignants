// Un modele de classe est soit du texte colle, soit un PDF televerse (Phase 4).
// Le PDF est prioritaire quand les deux sont presents pour la meme classe.
export type SelectedDocumentTemplate =
  | { source: 'text'; content: string; className: string; classId: string }
  | { source: 'pdf'; path: string; className: string; classId: string }

// Contenu pret a etre transmis au modele IA : soit du texte a interpoler dans
// le prompt, soit les octets du PDF (base64) a joindre en piece jointe. La
// resolution du PDF (lecture du stockage) se fait dans l'orchestration, pas
// dans les fonctions de generation elles-memes.
export type ResolvedDocumentTemplate =
  | { kind: 'text'; content: string }
  | { kind: 'pdf'; base64: string }
