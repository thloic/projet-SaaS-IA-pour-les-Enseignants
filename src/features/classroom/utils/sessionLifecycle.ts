import { dateInTimeZone, normalizeTimeZone, timeInTimeZone } from '../../../lib/timezone.ts'

export function buildSessionStartMetadata(input: {
  now: Date
  timeZone: string
  title?: string
}) {
  const timeZone = normalizeTimeZone(input.timeZone)
  const sessionDate = dateInTimeZone(input.now, timeZone)
  const title = input.title?.trim()
  return {
    sessionDate,
    title:
      title ||
      `Séance du ${new Intl.DateTimeFormat('fr-FR', {
        timeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(input.now)} à ${timeInTimeZone(input.now, timeZone)}`,
  }
}

export function isSessionStale(sessionDate: string, now: Date, timeZone: string) {
  return sessionDate !== dateInTimeZone(now, timeZone)
}
