import { followUpPlanMock } from '../mocks/followUpPlanMock.ts'
import {
  followUpPlanGeneratedSchema,
  followUpPlanSchema,
  type FollowUpPlan,
  type FollowUpPlanFinalItem,
  type FollowUpPlanGenerated,
} from '../schemas/followUpPlanSchema.ts'
import type { StudentContext } from '../types/memory.types.ts'
import { buildFollowUpPlanPrompt } from './followUpPlanPrompt.ts'
import type { ContentLanguage } from '@/features/i18n/locale'

export interface FollowUpPlanEvidenceItem {
  sourceId: string
  label: string
}

export interface GenerateFollowUpPlanInput {
  studentContext: StudentContext
  language?: ContentLanguage
}

export type FollowUpPlanGenerationMode = 'mock' | 'real'
export type StructuredFollowUpPlanGenerator = (prompt: string) => Promise<unknown>

export function getFollowUpPlanGenerationMode(): FollowUpPlanGenerationMode {
  const mode = process.env.FOLLOW_UP_PLAN_GENERATION_MODE ?? 'real'
  if (mode === 'mock' || mode === 'real') return mode
  throw new Error('INVALID_FOLLOW_UP_PLAN_GENERATION_MODE')
}

// Chaque observation garde son identifiant reel ; une adaptation institutionnelle
// (simple texte, sans identifiant propre) en recoit un identifiant synthetique et
// stable (son index dans la liste), pour rester tracable jusqu'a la donnee source exacte.
export function buildFollowUpPlanEvidence(studentContext: StudentContext): FollowUpPlanEvidenceItem[] {
  const observationEvidence = studentContext.observations.map((observation) => ({
    sourceId: observation.id,
    label: `Observation du ${observation.createdAt.slice(0, 10)} — ${observation.tag}${observation.note ? ` : ${observation.note}` : ''}`,
  }))
  const adaptationEvidence = studentContext.student.institutionalAdaptations.map((adaptation, index) => ({
    sourceId: `adaptation-${index}`,
    label: `Adaptation en place : ${adaptation}`,
  }))
  return [...observationEvidence, ...adaptationEvidence]
}

// Ancrage anti-hallucination : le modele ne choisit qu'un identifiant parmi ceux
// fournis, jamais le texte de la source lui-meme. Le texte final vient toujours
// de notre propre donnee reelle ; tout sourceId inconnu ou reutilise est rejete.
export function groundFollowUpPlan(
  generated: FollowUpPlanGenerated,
  evidence: FollowUpPlanEvidenceItem[],
  studentFullName: string
): FollowUpPlan {
  const evidenceById = new Map(evidence.map((item) => [item.sourceId, item.label]))
  const usedSourceIds = new Set<string>()
  const items: FollowUpPlanFinalItem[] = []

  for (const item of generated.items) {
    const source = evidenceById.get(item.sourceId)
    if (!source || usedSourceIds.has(item.sourceId)) continue
    usedSourceIds.add(item.sourceId)
    items.push({ ...item, source })
  }

  return followUpPlanSchema.parse({ eleve: { nom: studentFullName }, statut: 'brouillon', items })
}

export async function generateRealFollowUpPlan(
  input: GenerateFollowUpPlanInput,
  generator: StructuredFollowUpPlanGenerator
): Promise<FollowUpPlan> {
  const evidence = buildFollowUpPlanEvidence(input.studentContext)
  const prompt = buildFollowUpPlanPrompt(evidence, input.language ?? 'fr')
  const output = await generator(prompt)
  const generated = followUpPlanGeneratedSchema.parse(output)
  return groundFollowUpPlan(generated, evidence, input.studentContext.student.fullName)
}

export async function generateFollowUpPlan({
  studentContext,
  language = 'fr',
}: GenerateFollowUpPlanInput): Promise<FollowUpPlan> {
  const mode = getFollowUpPlanGenerationMode()
  if (mode === 'mock') {
    return followUpPlanSchema.parse(structuredClone(followUpPlanMock))
  }

  const { generateStructuredFollowUpPlanWithAnthropic } = await import('./followUpPlanModel.ts')
  return generateRealFollowUpPlan({ studentContext, language }, generateStructuredFollowUpPlanWithAnthropic)
}
