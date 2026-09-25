import { followUpPlanReviewMock } from '../mocks/followUpPlanReviewMock.ts'
import {
  followUpPlanReviewGeneratedSchema,
  type FollowUpPlanReviewGenerated,
} from '../schemas/followUpPlanReviewSchema.ts'
import type { FollowUpPlanRecord } from '../schemas/followUpPlanTrackingSchema.ts'
import { buildFollowUpPlanReviewPrompt } from './followUpPlanReviewPrompt.ts'
import type { ContentLanguage } from '@/features/i18n/locale'

export type FollowUpPlanReviewGenerationMode = 'mock' | 'real'
export type StructuredFollowUpPlanReviewGenerator = (prompt: string) => Promise<unknown>

export function getFollowUpPlanReviewGenerationMode(): FollowUpPlanReviewGenerationMode {
  const mode = process.env.FOLLOW_UP_PLAN_REVIEW_GENERATION_MODE ?? 'real'
  if (mode === 'mock' || mode === 'real') return mode
  throw new Error('INVALID_FOLLOW_UP_PLAN_REVIEW_GENERATION_MODE')
}

export async function generateRealFollowUpPlanReview(
  record: FollowUpPlanRecord,
  language: ContentLanguage,
  generator: StructuredFollowUpPlanReviewGenerator
): Promise<FollowUpPlanReviewGenerated> {
  const prompt = buildFollowUpPlanReviewPrompt(record, language)
  const output = await generator(prompt)
  return followUpPlanReviewGeneratedSchema.parse(output)
}

export async function generateFollowUpPlanReview(input: {
  record: FollowUpPlanRecord
  language?: ContentLanguage
}): Promise<FollowUpPlanReviewGenerated> {
  const mode = getFollowUpPlanReviewGenerationMode()
  if (mode === 'mock') {
    return followUpPlanReviewGeneratedSchema.parse(structuredClone(followUpPlanReviewMock))
  }

  const { generateStructuredFollowUpPlanReviewWithAnthropic } = await import('./followUpPlanReviewModel.ts')
  return generateRealFollowUpPlanReview(input.record, input.language ?? 'fr', generateStructuredFollowUpPlanReviewWithAnthropic)
}
