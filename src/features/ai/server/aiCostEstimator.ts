interface AIUsageCostInput {
  inputTokens?: number
  outputTokens?: number
  inputTokenDetails?: {
    cacheReadTokens?: number
    cacheWriteTokens?: number
  }
}

export function estimateAnthropicCostMicroUsd(model: string, usage: AIUsageCostInput): number {
  const inputRate = model.includes('haiku') ? 1 : 3
  const outputRate = model.includes('haiku') ? 5 : 15
  const cacheReadRate = model.includes('haiku') ? 0.1 : 0.3
  const cacheWriteRate = model.includes('haiku') ? 1.25 : 3.75

  return Math.round(
    (usage.inputTokens ?? 0) * inputRate
    + (usage.outputTokens ?? 0) * outputRate
    + (usage.inputTokenDetails?.cacheReadTokens ?? 0) * cacheReadRate
    + (usage.inputTokenDetails?.cacheWriteTokens ?? 0) * cacheWriteRate
  )
}
