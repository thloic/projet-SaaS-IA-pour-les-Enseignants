import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { hasActiveProAccess } from '@/features/billing/server/subscription'
import {
  checkAndIncrementUsageCore,
  getUsageCore,
  type UsageCoreDeps,
  type UsageLimits,
} from '@/features/billing/server/usageCore'

const DEFAULT_GENERATION_LIMIT = 3
const DEFAULT_PRO_GENERATION_LIMIT = 90
const DEFAULT_AGENT_PRO_GENERATION_LIMIT = 150

function envLimit(name: string, fallback: number): number {
  const configured = Number(process.env[name])
  return Number.isInteger(configured) && configured > 0 ? configured : fallback
}

function getGenerationLimits(feature: string): UsageLimits {
  if (feature !== 'agent') {
    return {
      free: DEFAULT_GENERATION_LIMIT,
      pro: envLimit('PRO_GENERATION_LIMIT', DEFAULT_PRO_GENERATION_LIMIT),
    }
  }

  return {
    free: envLimit('AGENT_GENERATION_LIMIT', DEFAULT_GENERATION_LIMIT),
    pro: envLimit('AGENT_PRO_GENERATION_LIMIT', DEFAULT_AGENT_PRO_GENERATION_LIMIT),
  }
}

function getCurrentPeriod() {
  return new Date().toISOString().slice(0, 7)
}

async function createUsageDeps(): Promise<UsageCoreDeps> {
  const supabase = await createClient()

  return {
    hasActiveProAccess,
    async incrementCounter(userId, feature, limit) {
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
      return Number.isFinite(used) ? used : -1
    },
    async readCounter(userId, feature) {
      const { data, error } = await supabase
        .from('usage_counters')
        .select('count')
        .eq('user_id', userId)
        .eq('period', getCurrentPeriod())
        .eq('feature', feature)
        .maybeSingle()

      if (error) {
        console.error('[usage] lecture du compteur refusee', error)
        return 0
      }

      return data?.count ?? 0
    },
  }
}

export async function checkAndIncrementUsage(
  userId: string,
  feature = 'general'
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limits = getGenerationLimits(feature)
  return checkAndIncrementUsageCore(userId, feature, limits, await createUsageDeps())
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
  const limits = getGenerationLimits(feature)
  return getUsageCore(userId, feature, limits, await createUsageDeps())
}
