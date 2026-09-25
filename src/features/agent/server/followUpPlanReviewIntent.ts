export interface FollowUpPlanReviewIntent {
  kind: 'generate_follow_up_plan_review'
  studentQuery: string
}

// Distinct de FOLLOW_UP_PLAN_REQUESTS (followUpPlanIntent.ts) : "bilan de
// révision" exige explicitement le mot bilan/review/balance de révision, pour
// ne jamais confondre une demande de brouillon avec une demande de clôture.
const FOLLOW_UP_PLAN_REVIEW_REQUESTS = [
  /^(?:je\s+veux\s+)?(?:g[eéè]n[eéè]re|g[eéè]n[eéè]rer|pr[eéè]pare|pr[eéè]parer|fais(?:-moi)?)\s+(?:moi\s+)?(?:le\s+|un\s+)?bilan\s+de\s+r[eéè]vision(?:\s+du\s+plan\s+de\s+suivi)?\s+(?:de|pour)\s+(.+?)\s*[.!?]?$/iu,
  /^(?:please\s+)?(?:generate|create|prepare|make)\s+(?:me\s+)?(?:the\s+|a\s+)?(?:follow[- ]up\s+plan\s+)?review\s+(?:summary\s+)?(?:for|of)\s+(.+?)\s*[.!?]?$/iu,
  /^(?:por\s+favor\s+)?(?:genera|generar|prepara|preparar|hazme)\s+(?:el\s+|un\s+)?balance\s+de\s+revisi[oó]n(?:\s+del\s+plan\s+de\s+seguimiento)?\s+(?:de|para)\s+(.+?)\s*[.!?¡¿]?$/iu,
]

export function detectFollowUpPlanReviewIntent(message: string): FollowUpPlanReviewIntent | null {
  const normalized = message.trim()
  const match = FOLLOW_UP_PLAN_REVIEW_REQUESTS.map((pattern) => pattern.exec(normalized)).find(Boolean)
  const studentQuery = match?.[1]?.trim().replace(/^['“”«]+|['“”»]+$/g, '')

  if (!studentQuery || studentQuery.length > 160) return null
  return { kind: 'generate_follow_up_plan_review', studentQuery }
}
