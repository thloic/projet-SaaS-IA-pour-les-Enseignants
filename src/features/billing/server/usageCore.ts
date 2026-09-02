export interface UsageResult {
  allowed: boolean
  used: number
  limit: number
}

export interface UsageCoreDeps {
  hasActiveProAccess(userId: string): Promise<boolean>
  incrementCounter(userId: string, feature: string, limit: number): Promise<number>
  readCounter(userId: string, feature: string): Promise<number>
}

// -1 est la convention "illimité" utilisée jusque dans l'UI (GenerationCounter).
const UNLIMITED = -1

export async function checkAndIncrementUsageCore(
  userId: string,
  feature: string,
  limit: number,
  deps: UsageCoreDeps
): Promise<UsageResult> {
  if (await deps.hasActiveProAccess(userId)) {
    return { allowed: true, used: 0, limit: UNLIMITED }
  }

  const used = await deps.incrementCounter(userId, feature, limit)
  if (!Number.isFinite(used) || used < 0) {
    return { allowed: false, used: limit, limit }
  }

  return { allowed: true, used, limit }
}

export async function getUsageCore(
  userId: string,
  feature: string,
  limit: number,
  deps: UsageCoreDeps
): Promise<{ used: number; limit: number }> {
  if (await deps.hasActiveProAccess(userId)) {
    return { used: 0, limit: UNLIMITED }
  }

  const used = await deps.readCounter(userId, feature)
  return { used, limit }
}
