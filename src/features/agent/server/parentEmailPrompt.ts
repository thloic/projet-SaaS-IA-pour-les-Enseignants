import type { ContentLanguage } from '@/features/i18n/locale'
import { languageLabel } from '../../i18n/locale.ts'
import type { ParentEmailRegister } from '../schemas/parentEmailSchema.ts'

const REGISTER_GUIDANCE: Record<ParentEmailRegister, string> = {
  comportement:
    'Le motif est le comportement en classe. Reformule toujours une difficulté en besoin ou en axe de progrès, jamais en reproche direct à l’élève.',
  echec:
    'Le motif est une difficulté ou un échec académique. Reste factuel sur les résultats fournis, sans dramatiser, et oriente vers des pistes concrètes de soutien.',
  plagiat:
    'Le motif est un plagiat ou une tricherie constatée par l’enseignant lui-même. Reste factuel et neutre sur les faits décrits par l’enseignant ci-dessous, sans accusation supplémentaire ni ton moralisateur.',
  autre:
    'Le motif ne correspond à aucune catégorie standard. Base-toi strictement sur la situation décrite ci-dessous.',
}

export function buildParentEmailPrompt(input: {
  studentFullName: string
  register: ParentEmailRegister
  situation?: string
  groundingLines: string[]
  language?: ContentLanguage
}): string {
  const language = input.language ?? 'fr'
  return [
    'Rédige un brouillon de courriel à envoyer aux parents d’un élève, conforme au schéma JSON demandé (subject, body).',
    `Rédige tous les contenus textuels en ${languageLabel(language)}. Les noms de clés JSON restent strictement ceux du schéma.`,
    `Élève concerné : ${input.studentFullName}.`,
    REGISTER_GUIDANCE[input.register],
    'N’invente aucun fait, aucun résultat et aucune date qui ne figure pas ci-dessous.',
    'Le ton reste respectueux et professionnel, jamais familier ni accusateur.',
    'Le corps du courriel est un texte complet et envoyable tel quel après relecture : formule d’ouverture, corps, proposition concrète de suite (rencontre, échange), formule de politesse — mais ne signe jamais à la place de l’enseignant (pas de nom inventé en signature).',
    'Ce courriel reste un brouillon : ne mentionne jamais qu’il a été rédigé par une intelligence artificielle, et ne présente jamais le contenu comme déjà envoyé.',
    '',
    'ÉLÉMENTS CONNUS DISPONIBLES :',
    ...(input.groundingLines.length > 0 ? input.groundingLines.map((line) => `- ${line}`) : ['- (aucune donnée déjà enregistrée, uniquement la situation décrite par l’enseignant ci-dessous)']),
    ...(input.situation ? ['', `SITUATION DÉCRITE PAR L’ENSEIGNANT : ${input.situation}`] : []),
  ].join('\n')
}
