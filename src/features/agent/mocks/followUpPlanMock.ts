import type { FollowUpPlan } from '../schemas/followUpPlanSchema.ts'

// Meme discipline que patMock.ts : un exemple fictif complet, valide contre le
// schema final, qui traverse toute la chaine sans appel reseau. Retourne tel
// quel en mode mock (voir generateFollowUpPlan.ts) — pas ajuste au vrai eleve.
export const followUpPlanMock: FollowUpPlan = {
  eleve: { nom: 'Maélis Roy' },
  statut: 'brouillon',
  items: [
    {
      sourceId: 'mock-observation-1',
      source: 'Observation du 2026-09-10 — À suivre : Besoin de soutien en lecture',
      constat: 'La lecture à voix haute reste hésitante sur les mots longs.',
      objectif: 'Gagner en fluidité sur des textes de son niveau.',
      indicateur: 'Lire un texte de son niveau avec un rythme régulier lors de trois observations consécutives.',
      echeance: 'dans 6 semaines',
      prochaineEtape: 'Proposer 10 minutes de lecture guidée deux fois par semaine.',
    },
    {
      sourceId: 'mock-adaptation-1',
      source: 'Adaptation en place : Temps supplémentaire',
      constat: 'Le temps supplémentaire déjà en place est utilisé pleinement.',
      objectif: 'Maintenir ce soutien pour les évaluations à venir.',
      indicateur: 'Utiliser le temps accordé et terminer les sections prévues lors des deux prochaines évaluations.',
      echeance: 'après les deux prochaines évaluations',
      prochaineEtape: 'Confirmer le temps supplémentaire pour la prochaine évaluation.',
    },
  ],
}
