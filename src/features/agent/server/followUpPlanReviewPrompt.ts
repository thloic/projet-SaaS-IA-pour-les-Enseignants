import type { ContentLanguage } from '@/features/i18n/locale'
import { languageLabel } from '../../i18n/locale.ts'
import type { FollowUpPlanRecord } from '../schemas/followUpPlanTrackingSchema.ts'

export function buildFollowUpPlanReviewPrompt(
  record: FollowUpPlanRecord,
  language: ContentLanguage = 'fr'
): string {
  const itemLines = record.items.map(
    (item) =>
      `- Objectif : ${item.objectif} — Statut : ${item.status}${item.revisionNote ? ` — Note de révision : ${item.revisionNote}` : ''}`
  )

  return [
    `Rédige un court bilan de révision (une à trois phrases) pour le plan de suivi de ${record.eleve.nom}, à partir uniquement des statuts réels listés ci-dessous.`,
    `Rédige en ${languageLabel(language)}.`,
    'N’invente aucun fait qui ne figure pas dans les statuts fournis. Ne mentionne aucun objectif qui n’est pas listé ci-dessous.',
    'Formule toute difficulté de façon bienveillante : jamais de formulation négative directe sur l’élève, reformule en axe de progrès pour la suite.',
    '',
    'OBJECTIFS ET STATUTS RÉELS :',
    ...itemLines,
  ].join('\n')
}
