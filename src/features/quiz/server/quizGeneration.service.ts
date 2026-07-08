import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { buildQuizPrompt } from '@/lib/prompts/quiz'
import { generatedQuizSchema } from '@/features/quiz/schemas/quizSchema'
import type { GradingSystem } from '@/features/profile/types/profile.types'
import type { GeneratedQuiz } from '@/features/quiz/types/quiz.types'

interface GenerateQuizFromContentInput {
  content: string
  gradingSystem: GradingSystem
  questionCount: number
  subject?: string | null
  level?: string | null
}

export function stripJsonCodeFence(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

export function parseGeneratedQuizJson(value: string): GeneratedQuiz {
  const json = stripJsonCodeFence(value)
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch (error) {
    console.error('[quiz:generation] JSON IA invalide', error)
    throw new Error('INVALID_AI_JSON')
  }

  const result = generatedQuizSchema.safeParse(normalizeGeneratedQuizCandidate(parsed))
  if (!result.success) {
    console.error('[quiz:generation] structure IA invalide', result.error.flatten())
    throw new Error('INVALID_AI_STRUCTURE')
  }

  return result.data
}

function readStringProperty(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function normalizeGeneratedQuizCandidate(candidate: unknown) {
  if (!candidate || typeof candidate !== 'object') return candidate

  const quiz = candidate as Record<string, unknown>
  const questions = Array.isArray(quiz.questions) ? quiz.questions : []

  return {
    ...quiz,
    questions: questions.map((question, index) => {
      if (!question || typeof question !== 'object') return question

      const record = question as Record<string, unknown>
      const type = record.type
      const correctionGuide = readStringProperty(record, [
        'correctionGuide',
        'correction_guide',
        'guide',
        'rubric',
      ])
      const correctAnswer =
        readStringProperty(record, [
          'correctAnswer',
          'correct_answer',
          'answer',
          'expectedAnswer',
          'expected_answer',
          'sampleAnswer',
          'sample_answer',
        ]) ||
        (type === 'open' && correctionGuide
          ? correctionGuide
          : '')

      return {
        ...record,
        id: readStringProperty(record, ['id']) || `q${index + 1}`,
        prompt: readStringProperty(record, ['prompt', 'question', 'statement', 'enonce']) || record.prompt,
        options: Array.isArray(record.options) ? record.options : [],
        correctAnswer,
        correctionGuide: correctionGuide || null,
      }
    }),
  }
}

function buildMockQuiz(input: GenerateQuizFromContentInput): GeneratedQuiz {
  const title = input.subject ? `Quiz - ${input.subject}` : 'Quiz de comprehension'
  const questions = [
    {
      id: 'q1',
      type: 'multiple_choice',
      prompt: 'Quel est le theme principal du contenu etudie ?',
      options: ['Une notion centrale du cours', 'Un exemple sans lien', 'Une consigne administrative', 'Une anecdote secondaire'],
      correctAnswer: 'Une notion centrale du cours',
      correctionGuide: null,
      points: 2,
    },
    {
      id: 'q2',
      type: 'true_false',
      prompt: 'Le document source contient des informations utiles pour construire une evaluation.',
      options: ['Vrai', 'Faux'],
      correctAnswer: 'Vrai',
      correctionGuide: null,
      points: 1,
    },
    {
      id: 'q3',
      type: 'multiple_choice',
      prompt: 'Que doit faire un eleve pour repondre correctement aux questions du quiz ?',
      options: [
        'S appuyer sur le contenu du cours',
        'Ignorer le document source',
        'Repondre au hasard',
        'Utiliser uniquement ses preferences personnelles',
      ],
      correctAnswer: 'S appuyer sur le contenu du cours',
      correctionGuide: null,
      points: 2,
    },
    {
      id: 'q4',
      type: 'open',
      prompt: 'Explique en quelques phrases une idee importante presentee dans le cours.',
      options: [],
      correctAnswer: 'La reponse doit reformuler une idee importante du document avec des mots personnels.',
      correctionGuide:
        'Attribuer les points si l eleve identifie une idee pertinente du contenu, l explique clairement et utilise un vocabulaire adapte.',
      points: 3,
    },
    {
      id: 'q5',
      type: 'multiple_choice',
      prompt: 'Quelle strategie aide le mieux a verifier sa comprehension du cours ?',
      options: [
        'Relire les passages importants et justifier ses reponses',
        'Memoriser seulement le titre',
        'Eviter les exemples',
        'Ne pas comparer les informations',
      ],
      correctAnswer: 'Relire les passages importants et justifier ses reponses',
      correctionGuide: null,
      points: 2,
    },
    {
      id: 'q6',
      type: 'open',
      prompt: 'Propose un exemple qui illustre une notion importante du contenu.',
      options: [],
      correctAnswer: 'La reponse doit proposer un exemple coherent avec une notion importante du cours.',
      correctionGuide:
        'Valoriser un exemple exact, relie au contenu et suffisamment explique. Ne pas retirer de points pour une formulation personnelle si l idee est correcte.',
      points: 2,
    },
    {
      id: 'q7',
      type: 'true_false',
      prompt: 'Un quiz efficace peut melanger QCM, vrai/faux et questions ouvertes.',
      options: ['Vrai', 'Faux'],
      correctAnswer: 'Vrai',
      correctionGuide: null,
      points: 1,
    },
    {
      id: 'q8',
      type: 'multiple_choice',
      prompt: 'Quelle reponse est la plus attendue dans une question ouverte ?',
      options: [
        'Une justification claire',
        'Un simple oui ou non',
        'Une option choisie sans explication',
        'Une phrase hors sujet',
      ],
      correctAnswer: 'Une justification claire',
      correctionGuide: null,
      points: 2,
    },
    {
      id: 'q9',
      type: 'open',
      prompt: 'Resume le contenu du cours en mettant en avant deux informations importantes.',
      options: [],
      correctAnswer: 'La reponse doit presenter deux informations importantes et coherentes avec le cours.',
      correctionGuide:
        'Accorder les points si deux informations pertinentes sont citees et reliees explicitement au contenu source.',
      points: 3,
    },
    {
      id: 'q10',
      type: 'multiple_choice',
      prompt: 'Quel element rend une reponse plus solide ?',
      options: ['Une preuve tiree du contenu', 'Une affirmation non justifiee', 'Une contradiction', 'Une omission importante'],
      correctAnswer: 'Une preuve tiree du contenu',
      correctionGuide: null,
      points: 2,
    },
  ] satisfies GeneratedQuiz['questions']

  const selectedQuestions = questions.slice(0, input.questionCount)
  return {
    title,
    gradingSystem: input.gradingSystem,
    questions: selectedQuestions,
    totalPoints: selectedQuestions.reduce((sum, question) => sum + question.points, 0),
  }
}

export async function generateQuizFromContent(input: GenerateQuizFromContentInput): Promise<GeneratedQuiz> {
  if (process.env.QUIZ_GENERATION_MODE === 'mock') {
    const mockQuiz = buildMockQuiz(input)
    const result = generatedQuizSchema.safeParse(mockQuiz)
    if (!result.success) {
      console.error('[quiz:generation] mock invalide', result.error.flatten())
      throw new Error('INVALID_MOCK_QUIZ')
    }

    return result.data
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[quiz:generation] ANTHROPIC_API_KEY manquante')
    throw new Error('MISSING_ANTHROPIC_API_KEY')
  }

  const prompt = buildQuizPrompt(input)

  let text: string
  try {
    const result = await generateText({
      model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
      prompt,
      temperature: 0.2,
      maxOutputTokens: 3500,
      maxRetries: 1,
      timeout: 45000,
    })

    text = result.text
  } catch (error) {
    console.error('[quiz:generation] appel Anthropic echoue', error)
    throw new Error('ANTHROPIC_GENERATION_FAILED')
  }

  const generatedQuiz = parseGeneratedQuizJson(text)
  if (generatedQuiz.gradingSystem !== input.gradingSystem) {
    console.error('[quiz:generation] systeme de notation incoherent', {
      expected: input.gradingSystem,
      received: generatedQuiz.gradingSystem,
    })
    throw new Error('INVALID_AI_STRUCTURE')
  }

  if (generatedQuiz.questions.length !== input.questionCount) {
    console.error('[quiz:generation] nombre de questions incoherent', {
      expected: input.questionCount,
      received: generatedQuiz.questions.length,
    })
    throw new Error('INVALID_AI_STRUCTURE')
  }

  return generatedQuiz
}
