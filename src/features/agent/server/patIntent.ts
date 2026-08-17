export interface PATIntent {
  kind: 'generate_pat'
  studentQuery: string
}

const PAT_REQUESTS = [
  /^(?:je\s+veux\s+)?(?:g[eéè]n[eéè]re|g[eéè]n[eéè]rer|pr[eéè]pare|pr[eéè]parer|cr[eéè]e|cr[eéè]er|fais(?:-moi)?)\s+(?:moi\s+)?(?:le\s+|un\s+)?(?:pat|plan\s+d['’ ]appui(?:\s+temporaire)?)\s+(?:de|pour)\s+(.+?)\s*[.!?]?$/iu,
  /^(?:please\s+)?(?:generate|create|prepare|make)\s+(?:me\s+)?(?:the\s+|a\s+)?(?:pat|tsp|temporary\s+support\s+plan|support\s+plan)\s+(?:for|of)\s+(.+?)\s*[.!?]?$/iu,
  /^(?:por\s+favor\s+)?(?:genera|generar|crea|crear|prepara|preparar|hazme)\s+(?:el\s+|un\s+)?(?:pat|plan\s+(?:temporal\s+)?de\s+apoyo)\s+(?:de|para)\s+(.+?)\s*[.!?¡¿]?$/iu,
]

export function detectPATIntent(message: string): PATIntent | null {
  const normalized = message.trim()
  const match = PAT_REQUESTS.map((pattern) => pattern.exec(normalized)).find(Boolean)
  const studentQuery = match?.[1]?.trim().replace(/^['“”«]+|['“”»]+$/g, '')

  if (!studentQuery || studentQuery.length > 160) return null
  return { kind: 'generate_pat', studentQuery }
}
