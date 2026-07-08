import type { GradingSystem } from '@/features/profile/types/profile.types'

interface BuildQuizPromptInput {
  content: string
  gradingSystem: GradingSystem
  questionCount: number
  subject?: string | null
  level?: string | null
}

export function buildQuizPrompt({
  content,
  gradingSystem,
  questionCount,
  subject,
  level,
}: BuildQuizPromptInput): string {
  return [
    'Tu es un assistant pedagogique expert. Genere un quiz strictement base sur le contenu fourni.',
    '',
    'Contraintes de sortie:',
    '- Reponds uniquement avec un objet JSON valide.',
    '- Aucun preambule, aucune explication, aucun bloc Markdown, aucun backtick.',
    '- Le JSON doit respecter exactement cette forme:',
    '{',
    '  "title": "string",',
    '  "gradingSystem": "percentage|20|10|letter|letter_ca|levels",',
    '  "questions": [',
    '    {',
    '      "id": "q1",',
    '      "type": "multiple_choice|true_false|open",',
    '      "prompt": "string",',
    '      "options": ["string"],',
    '      "correctAnswer": "string",',
    '      "correctionGuide": "string|null",',
    '      "points": 1',
    '    }',
    '  ],',
    '  "totalPoints": 10',
    '}',
    '',
    `Nombre de questions attendu: ${questionCount}.`,
    `Systeme de notation du profil enseignant: ${gradingSystem}. Stocke des points numeriques bruts.`,
    subject ? `Matiere: ${subject}.` : '',
    level ? `Niveau: ${level}.` : '',
    '',
    'Regles:',
    '- Melange QCM, vrai/faux et questions ouvertes.',
    '- Pour un QCM, options contient 2 a 6 choix et correctAnswer doit etre une option exacte.',
    '- Pour vrai/faux, options vaut exactement ["Vrai", "Faux"] et correctAnswer vaut "Vrai" ou "Faux".',
    '- Pour une question ouverte, options vaut [], correctAnswer contient une reponse attendue concise, et correctionGuide contient un guide de correction clair.',
    '- Le champ correctAnswer est obligatoire pour toutes les questions, y compris les questions ouvertes.',
    '- Ne note pas automatiquement les questions ouvertes; fournis seulement le guide.',
    '- La somme des points doit etre egale a totalPoints.',
    '',
    'Contenu source:',
    content,
  ]
    .filter(Boolean)
    .join('\n')
}
