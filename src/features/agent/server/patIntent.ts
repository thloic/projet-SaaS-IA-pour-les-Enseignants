export interface PATIntent {
  kind: 'generate_pat'
  studentQuery: string
}

const PAT_REQUEST =
  /^(?:je\s+veux\s+)?(?:g[eéè]n[eéè]re|g[eéè]n[eéè]rer|pr[eéè]pare|pr[eéè]parer|cr[eéè]e|cr[eéè]er|fais(?:-moi)?)\s+(?:moi\s+)?(?:le\s+|un\s+)?(?:pat|plan\s+d['’ ]appui(?:\s+temporaire)?)\s+(?:de|pour)\s+(.+?)\s*[.!?]?$/iu

export function detectPATIntent(message: string): PATIntent | null {
  const match = PAT_REQUEST.exec(message.trim())
  const studentQuery = match?.[1]?.trim().replace(/^['“”«]+|['“”»]+$/g, '')

  if (!studentQuery || studentQuery.length > 160) return null
  return { kind: 'generate_pat', studentQuery }
}
