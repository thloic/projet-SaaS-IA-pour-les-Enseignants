import type { ParentEmailDraft } from '../schemas/parentEmailSchema.ts'

// Meme discipline que followUpPlanMock.ts : un exemple fictif complet, valide
// contre le schema final, qui traverse toute la chaine sans appel reseau.
// Retourne tel quel en mode mock (voir generateParentEmailDraft.ts).
export const parentEmailMock: ParentEmailDraft = {
  subject: 'Point sur le comportement en classe',
  body: [
    'Bonjour,',
    '',
    'Je vous écris au sujet du comportement de votre enfant en classe ces dernières semaines.',
    'J’ai constaté quelques difficultés à rester concentré durant les activités de groupe, et j’aimerais en discuter avec vous afin de trouver ensemble des pistes de soutien.',
    '',
    'Seriez-vous disponible pour un court échange, en personne ou par téléphone, dans les prochains jours ?',
    '',
    'Je reste à votre disposition.',
    '',
    'Cordialement,',
  ].join('\n'),
}
