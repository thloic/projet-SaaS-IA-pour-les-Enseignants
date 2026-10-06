const PERSONAL_AI_FEATURES = new Set(['general', 'agent', 'correction'])

export function shouldBypassIncludedAIQuota(feature: string, hasActivePersonalKey: boolean): boolean {
  return hasActivePersonalKey && PERSONAL_AI_FEATURES.has(feature)
}
