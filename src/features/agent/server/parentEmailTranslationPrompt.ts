export function buildParentEmailTranslationPrompt(input: {
  subject: string
  body: string
  targetLanguage: string
}): string {
  return [
    `Traduis fidèlement ce brouillon de courriel en ${input.targetLanguage}, conforme au schéma JSON demandé (subject, body).`,
    'Traduis uniquement : ne reformule pas, n’ajoute aucune information, n’en retire aucune, ne change aucun fait, nom, date ou chiffre.',
    'Conserve le ton et le niveau de formalité du texte source.',
    'Si une formule de politesse ou une structure de courriel existe dans la langue cible, utilise la formulation naturelle et idiomatique correspondante plutôt qu’une traduction mot à mot.',
    'Ne signe jamais à la place de l’enseignant.',
    '',
    `SUJET SOURCE : ${input.subject}`,
    '',
    `CORPS SOURCE :\n${input.body}`,
  ].join('\n')
}
