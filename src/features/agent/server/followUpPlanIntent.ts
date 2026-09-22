export interface FollowUpPlanIntent {
  kind: 'generate_follow_up_plan'
  studentQuery: string
}

const FOLLOW_UP_PLAN_REQUESTS = [
  /^(?:je\s+veux\s+)?(?:g[eéè]n[eéè]re|g[eéè]n[eéè]rer|pr[eéè]pare|pr[eéè]parer|cr[eéè]e|cr[eéè]er|fais(?:-moi)?)\s+(?:moi\s+)?(?:le\s+|un\s+)?(?:plan\s+de\s+suivi|suivi)\s+(?:de|pour)\s+(.+?)\s*[.!?]?$/iu,
  /^(?:please\s+)?(?:generate|create|prepare|make)\s+(?:me\s+)?(?:the\s+|a\s+)?follow[- ]up\s+plan\s+(?:for|of)\s+(.+?)\s*[.!?]?$/iu,
  /^(?:por\s+favor\s+)?(?:genera|generar|crea|crear|prepara|preparar|hazme)\s+(?:el\s+|un\s+)?plan\s+de\s+seguimiento\s+(?:de|para)\s+(.+?)\s*[.!?¡¿]?$/iu,
]

export function detectFollowUpPlanIntent(message: string): FollowUpPlanIntent | null {
  const normalized = message.trim()
  const match = FOLLOW_UP_PLAN_REQUESTS.map((pattern) => pattern.exec(normalized)).find(Boolean)
  const studentQuery = match?.[1]?.trim().replace(/^['“”«]+|['“”»]+$/g, '')

  if (!studentQuery || studentQuery.length > 160) return null
  return { kind: 'generate_follow_up_plan', studentQuery }
}
