export const DEFAULT_TIME_ZONE = 'UTC'

export const TIME_ZONE_OPTIONS = [
  'UTC',
  'Africa/Abidjan',
  'Africa/Dakar',
  'Africa/Douala',
  'Africa/Lome',
  'America/Cancun',
  'America/Edmonton',
  'America/Halifax',
  'America/Mexico_City',
  'America/Monterrey',
  'America/Tijuana',
  'America/Toronto',
  'America/Vancouver',
  'America/Winnipeg',
  'Europe/Paris',
] as const

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 100) return false
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: value }).format(new Date())
    return true
  } catch {
    return false
  }
}

export function normalizeTimeZone(value: unknown): string {
  return isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE
}

export function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function timeInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: normalizeTimeZone(timeZone),
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export function suggestedTimeZone(country: string): string {
  const normalized = country.toLocaleLowerCase('fr')
  if (normalized.includes('mex')) return 'America/Mexico_City'
  if (normalized.includes('queb')) return 'America/Toronto'
  if (normalized.includes('ontario')) return 'America/Toronto'
  if (normalized.includes('france')) return 'Europe/Paris'
  if (normalized.includes('sénégal') || normalized.includes('senegal')) return 'Africa/Dakar'
  if (normalized.includes('cameroun')) return 'Africa/Douala'
  if (normalized.includes('togo')) return 'Africa/Lome'
  if (normalized.includes("côte d'ivoire") || normalized.includes("cote d'ivoire")) {
    return 'Africa/Abidjan'
  }
  return DEFAULT_TIME_ZONE
}
