export function normalizeInstitutionalAdaptations(value: string | string[]): string[] {
  const items = Array.isArray(value) ? value : value.split(/[,\n]/)
  const uniqueItems = new Map<string, string>()

  for (const rawItem of items) {
    const item = rawItem.trim().replace(/\s+/g, ' ')
    if (!item) continue

    const key = item.toLocaleLowerCase('fr')
    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, item)
    }
  }

  return [...uniqueItems.values()]
}

export function institutionalAdaptationsToText(adaptations: string[]): string {
  return normalizeInstitutionalAdaptations(adaptations).join('\n')
}
