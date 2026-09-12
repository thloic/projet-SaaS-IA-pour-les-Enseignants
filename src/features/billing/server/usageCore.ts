export interface UsageResult {
  allowed: boolean
  used: number
  limit: number
}

export interface UsageLimits {
  free: number
  pro: number
}

export interface UsageCoreDeps {
  hasActiveProAccess(userId: string): Promise<boolean>
  incrementCounter(userId: string, feature: string, limit: number): Promise<number>
  readCounter(userId: string, feature: string): Promise<number>
}

export async function checkAndIncrementUsageCore(
  userId: string,
  feature: string,
  limits: UsageLimits,
  deps: UsageCoreDeps
): Promise<UsageResult> {
  const limit = (await deps.hasActiveProAccess(userId)) ? limits.pro : limits.free

  const used = await deps.incrementCounter(userId, feature, limit)
  if (!Number.isFinite(used) || used < 0) {
    return { allowed: false, used: limit, limit }
  }

  return { allowed: true, used, limit }
}

export async function getUsageCore(
  userId: string,
  feature: string,
  limits: UsageLimits,
  deps: UsageCoreDeps
): Promise<{ used: number; limit: number }> {
  const limit = (await deps.hasActiveProAccess(userId)) ? limits.pro : limits.free
  const used = await deps.readCounter(userId, feature)
  return { used, limit }
}
