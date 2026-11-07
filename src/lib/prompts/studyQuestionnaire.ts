import type { ContentLanguage } from '@/features/profile/types/profile.types'
import { languageLabel } from '../../features/i18n/locale.ts'

interface BuildStudyQuestionnairePromptInput {
  sourceContent: string
  sourceTitle: string
  subject: string
  level: string
  language: ContentLanguage
  validationError?: string
}

export function buildStudyQuestionnairePrompt({
  sourceContent,
  sourceTitle,
  subject,
  level,
  language,
  validationError,
}: BuildStudyQuestionnairePromptInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    'Tu es un enseignant expérimenté qui transforme un texte source en questionnaire d’étude avec corrigé, pour des élèves du niveau indiqué.',
    'Les questions doivent couvrir les notions essentielles du texte source, sans rien inventer qui n’y figure pas.',
    'Utilise uniquement ces types : "vrai_faux" (choices absent, answer "Vrai" ou "Faux"), "choix_multiple" (choices de 3 à 6 éléments, answer identique à l’un d’eux), "reponse_courte" (choices absent, answer = réponse attendue).',
    'Chaque question peut avoir une explication brève dans "explanation".',
    'La sortie doit être uniquement un objet JSON strict au format { "title": "...", "questions": [{ "type": "...", "prompt": "...", "choices": [...], "answer": "...", "explanation": "..." }] } de 3 à 30 questions, sans markdown, sans backticks, sans texte autour.',
  ].join('\n')

  const userPrompt = [
    `Langue de rédaction attendue : ${languageLabel(language)}.`,
    `Matière : ${subject}. Niveau : ${level}.`,
    '',
    `TITRE DU QUESTIONNAIRE : ${sourceTitle}`,
    '',
    'TEXTE SOURCE (base du questionnaire) :',
    sourceContent,
    '',
    'Sortie attendue :',
    '{ "title": "...", "questions": [...] }',
    validationError
      ? [
          '',
          'La réponse précédente était invalide pour cette raison :',
          validationError,
          'Corrige la sortie en respectant strictement le format et les règles de chaque type de question.',
        ].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { systemPrompt, userPrompt }
}
