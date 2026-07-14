import 'server-only'

import { createClient } from '@/lib/supabase/server'

const FREE_GENERATION_LIMIT = 3

function getCurrentPeriod() {
  return new Date().toISOString().slice(0, 7)
}

export async function checkAndIncrementUsage(
  userId: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_limit: FREE_GENERATION_LIMIT,
  })

  if (error) {
    console.error('[usage] increment_usage refuse', error)
    throw new Error('USAGE_INCREMENT_FAILED')
  }

  const used = typeof data === 'number' ? data : Number(data)
  if (!Number.isFinite(used) || used < 0) {
    return { allowed: false, used: FREE_GENERATION_LIMIT, limit: FREE_GENERATION_LIMIT }
  }

  return { allowed: true, used, limit: FREE_GENERATION_LIMIT }
}

export async function decrementUsage(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('decrement_usage', {
    p_user_id: userId,
  })

  if (error) {
    console.error('[usage] decrement_usage refuse', error)
    throw new Error('USAGE_DECREMENT_FAILED')
  }

  const used = typeof data === 'number' ? data : Number(data)
  return Number.isFinite(used) ? used : 0
}

export async function getUsage(userId: string): Promise<{ used: number; limit: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('usage_counters')
    .select('count')
    .eq('user_id', userId)
    .eq('period', getCurrentPeriod())
    .maybeSingle()

  if (error) {
    console.error('[usage] lecture du compteur refusee', error)
    return { used: 0, limit: FREE_GENERATION_LIMIT }
  }

  return { used: data?.count ?? 0, limit: FREE_GENERATION_LIMIT }
}
