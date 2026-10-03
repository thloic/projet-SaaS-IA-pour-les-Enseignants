import type { ContentLanguage } from '@/features/i18n/locale'
import { languageLabel } from '../../i18n/locale.ts'

export function buildMeetingSummaryPrompt(input: {
  studentFullName: string
  notes: string
  language?: ContentLanguage
}): string {
  const language = input.language ?? 'fr'
  return [
    'Structure ces notes d’enseignant sur une rencontre avec des parents, conforme au schéma JSON demandé (subjectsDiscussed, agreementsReached, nextSteps).',
    `Rédige tous les contenus textuels en ${languageLabel(language)}. Les noms de clés JSON restent strictement ceux du schéma.`,
    `Élève concerné : ${input.studentFullName}.`,
    'N’invente et n’ajoute aucune information absente des notes ci-dessous : tu organises ce qui est écrit, tu ne complètes jamais.',
    'subjectsDiscussed : les sujets réellement abordés pendant la rencontre, un par élément.',
    'agreementsReached : seulement les points sur lesquels un accord explicite ressort des notes ; laisse la liste vide si les notes n’en mentionnent aucun.',
    'nextSteps : seulement les prochaines étapes explicitement mentionnées dans les notes ; laisse la liste vide si les notes n’en mentionnent aucune.',
    'Si l’élève est mentionné, reformule toujours une difficulté en besoin ou en axe de progrès, jamais en reproche direct.',
    '',
    `NOTES DE L’ENSEIGNANT :\n${input.notes}`,
  ].join('\n')
}
