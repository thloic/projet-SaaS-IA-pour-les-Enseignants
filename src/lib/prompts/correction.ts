import type { CorrectionTone } from '@/features/correction/schemas/correctionSchema'
import type { ContentLanguage } from '@/features/profile/types/profile.types'

interface BuildCorrectionPromptInput {
  contentText: string
  tone: CorrectionTone
  teacherProfile: {
    level?: string | null
    language: ContentLanguage
  }
  validationError?: string
}

const toneInstructions: Record<CorrectionTone, string> = {
  encourageant:
    'Ton encourageant : met en avant les progrès possibles, motive à continuer, reste chaleureux sans minimiser les points à travailler.',
  factuel:
    'Ton factuel : sobre, précis, centré sur les observations concrètes de la copie, sans jugement de valeur.',
  direct:
    'Ton direct : clair et concis, va droit au but sur ce qui doit être amélioré, tout en restant respectueux.',
}

function languageLabel(language: ContentLanguage) {
  return language === 'en' ? 'anglais' : 'français'
}

export function buildCorrectionPrompt({
  contentText,
  tone,
  teacherProfile,
  validationError,
}: BuildCorrectionPromptInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    'Tu es un enseignant expérimenté qui corrige une copie d’élève (rédaction/langues).',
    'Tu repères les erreurs réelles du texte et les classes strictement dans une de ces trois catégories : "syntaxe" (grammaire, conjugaison, accords), "comprehension" (sens, contresens, hors-sujet), "methode" (structure, organisation, argumentation).',
    'Règle absolue : aucune formulation négative directe dans le commentaire. Les difficultés doivent toujours être reformulées en axes de progrès.',
    'Exemple obligatoire à suivre : PAS "trop d’erreurs de conjugaison" MAIS "la conjugaison est le prochain axe de progression à consolider".',
    'Ne mentionne jamais le nom de l’élève ni aucune information personnelle : tu ne reçois que le texte de la copie.',
    'La sortie doit être uniquement un objet JSON strict au format { "findings": [{ "category": "...", "excerpt": "...", "suggestion": "..." }], "comment": "..." }, sans markdown, sans backticks, sans texte autour.',
  ].join('\n')

  const userPrompt = [
    `Langue de rédaction attendue : ${languageLabel(teacherProfile.language)}.`,
    teacherProfile.level ? `Niveau scolaire de l’élève : ${teacherProfile.level}.` : '',
    '',
    'Contraintes :',
    '- Chaque erreur détectée doit citer un extrait réel du texte (excerpt) et une suggestion concrète.',
    '- Ne pas inventer d’erreur qui ne figure pas dans le texte fourni.',
    '- Le commentaire fait 3 à 6 lignes, un seul paragraphe.',
    `- ${toneInstructions[tone]}`,
    '',
    'Sortie attendue :',
    '{ "findings": [...], "comment": "..." }',
    '',
    'TEXTE DE LA COPIE',
    contentText,
    'FIN DU TEXTE',
    validationError
      ? [
          '',
          'La réponse précédente était invalide pour cette raison :',
          validationError,
          'Corrige la sortie en respectant strictement le JSON attendu.',
        ].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { systemPrompt, userPrompt }
}
