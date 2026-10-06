import { z } from 'zod'

export const anthropicApiKeySchema = z.string()
  .trim()
  .min(20, 'La clé Anthropic est trop courte.')
  .max(300, 'La clé Anthropic est trop longue.')
  .regex(/^sk-ant-[A-Za-z0-9_-]+$/, 'Le format de la clé Anthropic est invalide.')

export const saveAICredentialSchema = z.object({
  apiKey: anthropicApiKeySchema,
}).strict()

export type AICredentialSource = 'included' | 'personal'

export interface AICredentialPublicStatus {
  connected: boolean
  active: boolean
  source: AICredentialSource
  provider: 'anthropic'
  keySuffix: string | null
  status: 'valid' | 'invalid' | 'revoked' | null
  validatedAt: string | null
  lastUsedAt: string | null
}
