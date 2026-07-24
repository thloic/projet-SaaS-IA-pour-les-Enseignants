import 'server-only'

import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import {
  generatedVariantSchema,
  type GeneratedVariant,
  type VariantType,
} from '@/features/adaptation/schemas/adaptationSchema'
import { buildVariantPrompt } from '@/lib/prompts/variant'

interface GenerateVariantInput {
  sourceContent: string
  sourceTitle: string
  subject: string
  level: string
  language: 'fr' | 'en'
  variantType: VariantType
  anonymousNeeds: string[]
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

function parseVariant(value: string): GeneratedVariant {
  let candidate: unknown
  try {
    candidate = JSON.parse(stripJsonCodeFence(value))
  } catch (error) {
    console.error('[adaptation:generation] JSON IA invalide', error)
    throw new Error('JSON invalide')
  }

  const parsed = generatedVariantSchema.safeParse(candidate)
  if (!parsed.success) {
    const details = parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    console.error('[adaptation:generation] structure IA invalide', parsed.error.flatten())
    throw new Error(details || 'Structure invalide')
  }

  return parsed.data
}

function buildMockVariant(input: GenerateVariantInput): GeneratedVariant {
  const labels: Record<VariantType, string> = {
    standard: 'Version standard',
    support: 'Version avec soutien',
    dys: 'Version adaptée DYS',
    adhd: 'Version adaptée TDAH',
    enrichment: 'Version enrichie',
  }

  const accommodations: Record<VariantType, string[]> = {
    standard: ['Organisation claire des informations et consignes explicites.'],
    support: ['Vocabulaire simplifié.', 'Consignes décomposées en étapes guidées.'],
    dys: ['Police lisible en taille 14 minimum.', 'Interligne 1,5 et alignement à gauche.'],
    adhd: ['Une consigne principale par zone.', 'Micro-étapes avec repères de progression.'],
    enrichment: ['Défis ouverts et approfondissement autonome.'],
  }

  return generatedVariantSchema.parse({
    title: `${input.sourceTitle} — ${labels[input.variantType]}`,
    summary:
      'Cette version conserve les objectifs essentiels de la leçon tout en ajustant les consignes, les aides et le niveau d’autonomie.',
    learningObjectives: [
      `Comprendre la notion principale étudiée en ${input.subject}.`,
      'Expliquer sa démarche avec un vocabulaire adapté.',
    ],
    sections: [
      {
        heading: 'Découvrir la notion',
        content:
          'L’enseignant présente la notion à partir d’un exemple concret, puis fait reformuler les informations importantes.',
        instructions: ['Observe l’exemple.', 'Repère les informations utiles.', 'Explique ce que tu comprends.'],
      },
      {
        heading: 'Mettre en pratique',
        content:
          'Les élèves appliquent la méthode sur une situation proche avant de travailler de manière plus autonome.',
        instructions: ['Lis la situation.', 'Choisis une stratégie.', 'Vérifie ta réponse.'],
      },
    ],
    exercises: [
      {
        instruction: 'Résous une situation simple puis justifie les étapes utilisées.',
        supportHint: input.variantType === 'enrichment' ? null : 'Commence par entourer les informations utiles.',
      },
    ],
    accommodations: accommodations[input.variantType],
    teacherNotes: ['Vérifier la compréhension avant de passer à l’étape suivante.'],
    visualSupports:
      input.variantType === 'dys' || input.variantType === 'adhd'
        ? ['Repère visuel indiquant le début de chaque étape.']
        : [],
  })
}

async function requestVariant(
  input: GenerateVariantInput,
  validationError?: string
): Promise<GeneratedVariant> {
  const { systemPrompt, userPrompt } = buildVariantPrompt({
    ...input,
    validationError,
  })

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.2,
    maxOutputTokens: 4500,
    maxRetries: 1,
    timeout: 60000,
    abortSignal: input.signal,
  })

  return parseVariant(result.text)
}

export async function generateAdaptationVariant(
  input: GenerateVariantInput
): Promise<GeneratedVariant> {
  const mode = process.env.VARIANT_GENERATION_MODE
  const forcedFailureType = process.env.VARIANT_GENERATION_FAIL_TYPE

  if (mode === 'fail' || forcedFailureType === input.variantType) {
    throw new Error('VARIANT_GENERATION_FAILED_FOR_TEST')
  }

  if (mode === 'mock') {
    return buildMockVariant(input)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[adaptation:generation] ANTHROPIC_API_KEY manquante')
    throw new Error('MISSING_ANTHROPIC_API_KEY')
  }

  try {
    return await requestVariant(input)
  } catch (firstError) {
    const message = firstError instanceof Error ? firstError.message : 'Réponse invalide'
    console.error('[adaptation:generation] première tentative échouée', {
      variantType: input.variantType,
      error: firstError,
    })

    try {
      return await requestVariant(input, message)
    } catch (retryError) {
      console.error('[adaptation:generation] seconde tentative échouée', {
        variantType: input.variantType,
        error: retryError,
      })
      throw new Error('ADAPTATION_GENERATION_FAILED')
    }
  }
}
