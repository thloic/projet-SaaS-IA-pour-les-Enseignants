interface SupabaseErrorLike {
  code?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
}

function errorText(error: SupabaseErrorLike): string {
  return [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()
}

/**
 * Postgres/PostgREST report a migration not yet applied either as 42P01 or
 * PGRST205. This is the only storage error for which the app may safely use
 * the included provider: no personal credential can exist before the table.
 */
export function isAICredentialStorageMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as SupabaseErrorLike
  if (candidate.code === '42P01' || candidate.code === 'PGRST205') return true

  const text = errorText(candidate)
  return text.includes('user_ai_credentials') && (
    text.includes('does not exist')
    || text.includes('could not find the table')
    || text.includes('schema cache')
  )
}

export function describeSupabaseError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown'
  const candidate = error as SupabaseErrorLike
  const code = typeof candidate.code === 'string' ? candidate.code : 'unknown'
  const message = typeof candidate.message === 'string' ? candidate.message : 'unknown'
  return `${code}: ${message}`
}
