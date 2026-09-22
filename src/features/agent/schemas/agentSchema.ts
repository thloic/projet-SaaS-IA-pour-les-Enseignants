import { z } from 'zod'
import { PATSchema } from './patSchema.ts'

export const agentMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(8000),
})

export const agentChatRequestSchema = z.object({
  messages: z.array(agentMessageSchema).min(1).max(50),
})

const studentCandidateResponseSchema = z
  .object({
    id: z.string().uuid(),
    fullName: z.string().min(1),
    classes: z.array(z.string().min(1)),
  })
  .strict()

export const agentStructuredResponseSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('clarification'),
      message: z.string().min(1),
      candidates: z.array(studentCandidateResponseSchema).min(2),
    })
    .strict(),
  z
    .object({
      kind: z.literal('student_not_found'),
      message: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('template_missing'),
      message: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('student_data_missing'),
      message: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('document_not_found_for_modification'),
      message: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('pat'),
      studentId: z.string().uuid(),
      language: z.enum(['fr', 'en', 'es']),
      pat: PATSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('bulletin'),
      studentId: z.string().uuid(),
      subject: z.string().min(1),
      grade: z.string().min(1),
      comment: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('follow_up_plan'),
      studentId: z.string().uuid(),
      message: z.string().min(1),
      items: z
        .array(
          z
            .object({
              sourceId: z.string().min(1),
              source: z.string().min(1),
              constat: z.string().min(1),
              objectif: z.string().min(1),
              prochaineEtape: z.string().min(1),
            })
            .strict()
        )
        .min(1),
    })
    .strict(),
])

export type AgentMessage = z.infer<typeof agentMessageSchema>
export type AgentChatRequest = z.infer<typeof agentChatRequestSchema>
export type AgentStructuredResponse = z.infer<typeof agentStructuredResponseSchema>
