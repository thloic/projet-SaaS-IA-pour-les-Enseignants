import type { MeetingSummaryDraft } from '../schemas/meetingSummarySchema.ts'

// Meme discipline que parentEmailMock.ts : un exemple fictif complet, valide
// contre le schema final, qui traverse toute la chaine sans appel reseau.
export const meetingSummaryMock: MeetingSummaryDraft = {
  subjectsDiscussed: [
    'Difficultés récentes en lecture à voix haute',
    'Impact du temps d’écran en soirée sur la concentration en classe',
  ],
  agreementsReached: [
    'Limiter le temps d’écran les soirs de semaine',
    'Mettre en place 10 minutes de lecture guidée à la maison',
  ],
  nextSteps: [
    'Nouveau point téléphonique dans trois semaines',
  ],
}
