import type { ContentLanguage } from '@/features/profile/types/profile.types'
import { languageLabel } from '../../features/i18n/locale.ts'

interface BuildExamVariantPromptInput {
  sourceContent: string
  sourceTitle: string
  subject: string
  level: string
  language: ContentLanguage
  validationError?: string
}

export function buildExamVariantPrompt({
  sourceContent,
  sourceTitle,
  subject,
  level,
  language,
  validationError,
}: BuildExamVariantPromptInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    'Tu es un enseignant expérimenté qui prépare trois versions équivalentes, étiquetées A, B, C, d’un même examen, pour éviter la copie entre élèves assis côte à côte.',
    'Les trois versions doivent avoir exactement le même nombre de questions et, question par question dans le même ordre, le même barème (points) — seules la formulation, les valeurs numériques ou les exemples changent.',
    'Aucune question ne doit être reprise à l’identique d’une version à l’autre : chaque version reste distincte tout en évaluant la même compétence, au même niveau de difficulté.',
    'La sortie doit être uniquement un objet JSON strict au format { "variants": [{ "label": "A", "title": "...", "questions": [{ "prompt": "...", "points": n }] }, ...] } avec exactement les 3 variantes A, B, C, sans markdown, sans backticks, sans texte autour.',
  ].join('\n')

  const userPrompt = [
    `Langue de rédaction attendue : ${languageLabel(language)}.`,
    `Matière : ${subject}. Niveau : ${level}.`,
    '',
    `TITRE DE L’EXAMEN SOURCE : ${sourceTitle}`,
    '',
    'CONTENU SOURCE (base de l’examen à décliner en 3 versions) :',
    sourceContent,
    '',
    'Sortie attendue :',
    '{ "variants": [...] }',
    validationError
      ? [
          '',
          'La réponse précédente était invalide pour cette raison :',
          validationError,
          'Corrige la sortie en respectant strictement le format attendu et les contraintes de cohérence.',
        ].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return { systemPrompt, userPrompt }
}
