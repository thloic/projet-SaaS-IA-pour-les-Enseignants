import type { ContentLanguage } from '@/features/i18n/locale'
import { languageLabel } from '../../i18n/locale.ts'
import type { FollowUpPlanEvidenceItem } from './generateFollowUpPlan.ts'

export function buildFollowUpPlanPrompt(
  evidence: FollowUpPlanEvidenceItem[],
  language: ContentLanguage = 'fr'
): string {
  return [
    'Rédige un brouillon de plan de suivi conforme au schéma JSON demandé, à partir uniquement des éléments listés ci-dessous.',
    `Rédige tous les contenus textuels en ${languageLabel(language)}. Les noms de clés JSON restent strictement ceux du schéma.`,
    'Pour chaque élément du plan, choisis un sourceId strictement parmi ceux fournis ci-dessous — jamais un identifiant inventé.',
    'Un même sourceId ne peut être utilisé que dans un seul élément du plan.',
    'N’invente aucune information qui ne figure pas dans les éléments fournis.',
    'Formule chaque constat et chaque objectif de façon bienveillante : jamais de formulation négative directe sur l’élève, reformule toujours une difficulté en besoin ou en axe de progrès.',
    'Chaque objectif doit être précis et mesurable. Ajoute un indicateur observable permettant à l’enseignant de vérifier la progression.',
    'Ajoute une échéance réaliste sous forme de durée de révision, par exemple « dans 6 semaines ». N’invente jamais une date institutionnelle.',
    '',
    'ÉLÉMENTS DISPONIBLES (sourceId — description) :',
    ...evidence.map((item) => `- ${item.sourceId} — ${item.label}`),
  ].join('\n')
}
