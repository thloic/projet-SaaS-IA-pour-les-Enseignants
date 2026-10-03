import { meetingSummaryMock } from '../mocks/meetingSummaryMock.ts'
import { meetingSummaryDraftSchema, type MeetingSummaryDraft } from '../schemas/meetingSummarySchema.ts'
import { buildMeetingSummaryPrompt } from './meetingSummaryPrompt.ts'
import type { ContentLanguage } from '@/features/i18n/locale'

export interface GenerateMeetingSummaryInput {
  studentFullName: string
  notes: string
  language?: ContentLanguage
}

export type MeetingSummaryGenerationMode = 'mock' | 'real'
export type StructuredMeetingSummaryGenerator = (prompt: string) => Promise<unknown>

export function getMeetingSummaryGenerationMode(): MeetingSummaryGenerationMode {
  const mode = process.env.PARENT_MEETING_SUMMARY_GENERATION_MODE ?? 'real'
  if (mode === 'mock' || mode === 'real') return mode
  throw new Error('INVALID_PARENT_MEETING_SUMMARY_GENERATION_MODE')
}

export async function generateRealMeetingSummary(
  input: GenerateMeetingSummaryInput,
  generator: StructuredMeetingSummaryGenerator
): Promise<MeetingSummaryDraft> {
  const prompt = buildMeetingSummaryPrompt(input)
  const output = await generator(prompt)
  return meetingSummaryDraftSchema.parse(output)
}

export async function generateMeetingSummary(
  input: GenerateMeetingSummaryInput
): Promise<MeetingSummaryDraft> {
  const mode = getMeetingSummaryGenerationMode()
  if (mode === 'mock') {
    return meetingSummaryDraftSchema.parse(structuredClone(meetingSummaryMock))
  }

  const { generateStructuredMeetingSummaryWithAnthropic } = await import('./meetingSummaryModel.ts')
  return generateRealMeetingSummary(input, generateStructuredMeetingSummaryWithAnthropic)
}
