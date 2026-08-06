import 'server-only'

import { createClient } from '@/lib/supabase/server'

const DEFAULT_GENERATION_LIMIT = 3

function getGenerationLimit(feature: string): number {
  if (feature !== 'agent') return DEFAULT_GENERATION_LIMIT

  const configuredLimit = Number(process.env.AGENT_GENERATION_LIMIT)
  return Number.isInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : DEFAULT_GENERATION_LIMIT
}

function getCurrentPeriod() {
  return new Date().toISOString().slice(0, 7)
}

export async function checkAndIncrementUsage(
  userId: string,
  feature = 'general'
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = getGenerationLimit(feature)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_limit: limit,
    p_feature: feature,
  })

  if (error) {
    console.error('[usage] increment_usage refuse', error)
    throw new Error('USAGE_INCREMENT_FAILED')
  }

  const used = typeof data === 'number' ? data : Number(data)
  if (!Number.isFinite(used) || used < 0) {
    return { allowed: false, used: limit, limit }
  }

  return { allowed: true, used, limit }
}

export async function decrementUsage(userId: string, feature = 'general'): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('decrement_usage', {
    p_user_id: userId,
    p_feature: feature,
  })

  if (error) {
    console.error('[usage] decrement_usage refuse', error)
    throw new Error('USAGE_DECREMENT_FAILED')
  }

  const used = typeof data === 'number' ? data : Number(data)
  return Number.isFinite(used) ? used : 0
}

export async function getUsage(
  userId: string,
  feature = 'general'
): Promise<{ used: number; limit: number }> {
  const limit = getGenerationLimit(feature)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('usage_counters')
    .select('count')
    .eq('user_id', userId)
    .eq('period', getCurrentPeriod())
    .eq('feature', feature)
    .maybeSingle()

  if (error) {
    console.error('[usage] lecture du compteur refusee', error)
    return { used: 0, limit }
  }

  return { used: data?.count ?? 0, limit }
}
