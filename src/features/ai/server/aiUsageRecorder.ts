import 'server-only'

import { getCurrentUser } from '@/features/profile/server/profile'
import { createClient } from '@/lib/supabase/server'
import { getActiveAICredential } from '@/features/ai-credentials/server/aiCredentialRepository'
import { modelForTask, type AITask } from './aiTaskPolicies'
import { estimateAnthropicCostMicroUsd } from './aiCostEstimator'

interface AIUsageLike {
  inputTokens?: number
  outputTokens?: number
  inputTokenDetails?: {
    cacheReadTokens?: number
    cacheWriteTokens?: number
  }
}

export async function recordCurrentUserAIUsage(
  task: AITask,
  feature: string,
  usage: AIUsageLike,
  durationMs?: number
): Promise<void> {
  try {
    const user = await getCurrentUser()
    if (!user) return
    const model = modelForTask(task)
    const source = await getActiveAICredential(user.id) ? 'personal' : 'included'
    const supabase = await createClient()
    const { error } = await supabase.from('ai_usage_events').insert({
      user_id: user.id,
      feature,
      provider: 'anthropic',
      credential_source: source,
      model,
      input_tokens: usage.inputTokens ?? 0,
      output_tokens: usage.outputTokens ?? 0,
      cache_creation_tokens: usage.inputTokenDetails?.cacheWriteTokens ?? 0,
      cache_read_tokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
      estimated_cost_microusd: estimateAnthropicCostMicroUsd(model, usage),
      duration_ms: durationMs ?? null,
      status: 'success',
    })
    if (error) console.error('[ai-usage] enregistrement refusé', error)
  } catch (error) {
    // La télémétrie ne doit jamais faire échouer une génération réussie.
    console.error('[ai-usage] mesure indisponible', error instanceof Error ? error.message : 'unknown')
  }
}
