import 'server-only'

import { createAnthropic } from '@ai-sdk/anthropic'
import { getCurrentUser } from '@/features/profile/server/profile'
import { decryptCredential } from '@/features/ai-credentials/server/credentialEncryption'
import {
  getActiveAICredential,
  touchAICredential,
} from '@/features/ai-credentials/server/aiCredentialRepository'
import { modelForTask, type AITask } from './aiTaskPolicies'

export type AICredentialSource = 'included' | 'personal'

export class PersonalAICredentialError extends Error {
  constructor(message = 'PERSONAL_AI_CREDENTIAL_UNAVAILABLE') {
    super(message)
    this.name = 'PersonalAICredentialError'
  }
}

export async function resolveAnthropicProviderForUser(userId: string): Promise<{
  provider: ReturnType<typeof createAnthropic>
  source: AICredentialSource
}> {
  const stored = await getActiveAICredential(userId)
  if (stored) {
    try {
      const apiKey = decryptCredential({
        encryptedSecret: stored.encryptedSecret,
        iv: stored.iv,
        authTag: stored.authTag,
        version: stored.version,
      })
      await touchAICredential(userId)
      return { provider: createAnthropic({ apiKey }), source: 'personal' }
    } catch (error) {
      console.error('[ai-provider] clé personnelle illisible', error instanceof Error ? error.message : 'unknown')
      throw new PersonalAICredentialError()
    }
  }

  const platformKey = process.env.ANTHROPIC_API_KEY
  if (!platformKey) throw new Error('MISSING_ANTHROPIC_API_KEY')
  return { provider: createAnthropic({ apiKey: platformKey }), source: 'included' }
}

export async function getCurrentUserAnthropicModel(task: AITask) {
  const user = await getCurrentUser()
  if (!user) throw new Error('AUTH_REQUIRED')
  const { provider } = await resolveAnthropicProviderForUser(user.id)
  return provider(modelForTask(task))
}
