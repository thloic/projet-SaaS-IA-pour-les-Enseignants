import {
  studyQuestionnaireSchema,
  type StudyQuestionnaire,
} from '../schemas/studyQuestionnaireSchema.ts'
import { buildStudyQuestionnairePrompt } from '../../../lib/prompts/studyQuestionnaire.ts'
import type { ContentLanguage } from '@/features/profile/types/profile.types'

interface GenerateStudyQuestionnaireInput {
  sourceContent: string
  sourceTitle: string
  subject: string
  level: string
  language: ContentLanguage
  signal?: AbortSignal
}

function stripJsonCodeFence(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

// Exportée pour être testée sans appel réseau : valide la structure Zod, y
// compris les règles propres à chaque type de question (voir le schéma).
export function parseStudyQuestionnaire(value: string): StudyQuestionnaire {
  let candidate: unknown
  try {
    candidate = JSON.parse(stripJsonCodeFence(value))
  } catch (error) {
    console.error('[adaptation:study-questionnaire] JSON IA invalide', error)
    throw new Error('JSON invalide')
  }
  return studyQuestionnaireSchema.parse(candidate)
}

function buildMockStudyQuestionnaire(input: GenerateStudyQuestionnaireInput): StudyQuestionnaire {
  return studyQuestionnaireSchema.parse({
    title: input.sourceTitle,
    questions: [
      { type: 'vrai_faux', prompt: `Le texte source porte sur ${input.subject}.`, answer: 'Vrai' },
      {
        type: 'choix_multiple',
        prompt: 'Quelle est la notion centrale du texte ?',
        choices: ['Notion A', 'Notion B', 'Notion C'],
        answer: 'Notion A',
      },
      { type: 'reponse_courte', prompt: 'Résume le texte en une phrase.', answer: 'Réponse attendue (mode test).' },
    ],
  })
}

// L'appel réseau n'est importé qu'ici : en mode mock, le module model (qui porte
// `server-only`) n'est jamais résolu.
async function requestStudyQuestionnaire(
  input: GenerateStudyQuestionnaireInput,
  validationError?: string
): Promise<StudyQuestionnaire> {
  const { systemPrompt, userPrompt } = buildStudyQuestionnairePrompt({ ...input, validationError })
  const { generateStudyQuestionnaireTextWithAnthropic } = await import('./studyQuestionnaireModel.ts')
  const text = await generateStudyQuestionnaireTextWithAnthropic(systemPrompt, userPrompt, input.signal)
  return parseStudyQuestionnaire(text)
}

export async function generateStudyQuestionnaire(
  input: GenerateStudyQuestionnaireInput
): Promise<StudyQuestionnaire> {
  const mode = process.env.STUDY_QUESTIONNAIRE_GENERATION_MODE

  if (mode === 'fail') {
    throw new Error('STUDY_QUESTIONNAIRE_GENERATION_FAILED_FOR_TEST')
  }
  if (mode === 'mock') {
    return buildMockStudyQuestionnaire(input)
  }

  try {
    return await requestStudyQuestionnaire(input)
  } catch (firstError) {
    const message = firstError instanceof Error ? firstError.message : 'Réponse invalide'
    console.error('[adaptation:study-questionnaire] première tentative échouée', firstError)

    try {
      return await requestStudyQuestionnaire(input, message)
    } catch (retryError) {
      console.error('[adaptation:study-questionnaire] seconde tentative échouée', retryError)
      throw new Error('STUDY_QUESTIONNAIRE_GENERATION_FAILED')
    }
  }
}
