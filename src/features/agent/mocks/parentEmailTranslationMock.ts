import type { ParentEmailDraft } from '../schemas/parentEmailSchema.ts'

// Meme discipline que parentEmailMock.ts : un exemple fictif complet, valide
// contre le schema final, qui traverse toute la chaine sans appel reseau.
// N'est pas derive du texte source (voir generateParentEmailTranslation.ts) —
// uniquement pour verifier manuellement que le pipeline fonctionne de bout en
// bout en mode mock.
export const parentEmailTranslationMock: ParentEmailDraft = {
  subject: 'Update on classroom behavior',
  body: [
    'Hello,',
    '',
    'I am writing to you about your child’s behavior in class over the past few weeks.',
    'I have noticed some difficulty staying focused during group activities, and I would like to discuss this with you to find ways to help together.',
    '',
    'Would you be available for a short conversation, in person or by phone, in the coming days?',
    '',
    'I remain available to you.',
    '',
    'Sincerely,',
  ].join('\n'),
}
