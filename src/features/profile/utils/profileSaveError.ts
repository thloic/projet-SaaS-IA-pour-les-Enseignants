interface SupabaseLikeError {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizeProfileSaveError(error: unknown): SupabaseLikeError {
  if (error instanceof Error) {
    // PostgrestError extends Error and adds code / details / hint as own properties
    const e = error as Error & { code?: unknown; details?: unknown; hint?: unknown }
    return {
      code: typeof e.code === 'string' ? e.code : undefined,
      message: e.message || undefined,
      details: typeof e.details === 'string' ? e.details : e.details === null ? null : undefined,
      hint: typeof e.hint === 'string' ? e.hint : e.hint === null ? null : undefined,
    }
  }

  if (!isRecord(error)) {
    return { message: String(error) }
  }

  return {
    code: typeof error.code === 'string' ? error.code : undefined,
    message: typeof error.message === 'string' ? error.message : undefined,
    details: typeof error.details === 'string' || error.details === null ? (error.details as string | null) : undefined,
    hint: typeof error.hint === 'string' || error.hint === null ? (error.hint as string | null) : undefined,
  }
}

export function isMissingSubjectsColumnError(error: unknown) {
  const normalized = normalizeProfileSaveError(error)
  const text = [normalized.message, normalized.details, normalized.hint].filter(Boolean).join(' ')

  return (
    (normalized.code === '42703' || normalized.code === 'PGRST204') &&
    text.includes('subjects')
  )
}

export function isMissingInterfaceLanguageColumnError(error: unknown) {
  const normalized = normalizeProfileSaveError(error)
  const text = [normalized.message, normalized.details, normalized.hint].filter(Boolean).join(' ')

  return (
    (normalized.code === '42703' || normalized.code === 'PGRST204') &&
    text.includes('interface_language')
  )
}

export function isMissingTimezoneColumnError(error: unknown) {
  const normalized = normalizeProfileSaveError(error)
  const text = [normalized.message, normalized.details, normalized.hint].filter(Boolean).join(' ')
  return (
    (normalized.code === '42703' || normalized.code === 'PGRST204') &&
    text.includes('timezone')
  )
}

export function isUnsupportedGradingSystemError(error: unknown) {
  const normalized = normalizeProfileSaveError(error)
  const text = [normalized.message, normalized.details, normalized.hint].filter(Boolean).join(' ')

  return normalized.code === '23514' && text.includes('teacher_profiles_grading_system_check')
}

export function isInvalidAuthUserReferenceError(error: unknown) {
  const normalized = normalizeProfileSaveError(error)
  const text = [normalized.message, normalized.details, normalized.hint].filter(Boolean).join(' ')

  return (
    normalized.code === '23503' &&
    text.includes('teacher_profiles_user_id_fkey') &&
    text.includes('table "users"')
  )
}

export function getProfileSaveErrorMessage(error: unknown) {
  const normalized = normalizeProfileSaveError(error)

  if (normalized.message === 'AUTH_REQUIRED') {
    return 'Votre session a expiré. Reconnectez-vous avant de terminer votre profil.'
  }

  if (isInvalidAuthUserReferenceError(error)) {
    return 'Votre session est invalide. Reconnectez-vous pour créer votre profil.'
  }

  if (isMissingSubjectsColumnError(error)) {
    return "Le profil a été enregistré en mode compatible, mais la base doit appliquer la migration des matières multiples."
  }

  if (isMissingInterfaceLanguageColumnError(error)) {
    return "La préférence de langue n’a pas été enregistrée : appliquez la migration 022 de Supabase."
  }

  return "Nous n’avons pas pu enregistrer votre profil pour le moment. Réessayez dans quelques instants."
}

export function withoutSubjectsColumn<T extends { subjects?: unknown }>(payload: T) {
  const legacyPayload = { ...payload }
  delete legacyPayload.subjects
  return legacyPayload
}

export function withoutInterfaceLanguageColumn<T extends { interface_language?: unknown }>(payload: T) {
  const legacyPayload = { ...payload }
  delete legacyPayload.interface_language
  return legacyPayload
}

export function withoutTimezoneColumn<T extends { timezone?: unknown }>(payload: T) {
  const legacyPayload = { ...payload }
  delete legacyPayload.timezone
  return legacyPayload
}

export function withLegacyGradingSystem<T extends { grading_system?: unknown }>(payload: T) {
  const legacyPayload = { ...payload }

  if (legacyPayload.grading_system === 'letter_ca') {
    legacyPayload.grading_system = 'letter'
  } else if (
    legacyPayload.grading_system === 'percentage' ||
    legacyPayload.grading_system === 'levels'
  ) {
    legacyPayload.grading_system = '20'
  }

  return legacyPayload
}

export function withLegacyProfileCompatibility<
  T extends { subjects?: unknown; grading_system?: unknown; interface_language?: unknown; timezone?: unknown },
>(payload: T) {
  return withoutTimezoneColumn(
    withoutInterfaceLanguageColumn(withoutSubjectsColumn(withLegacyGradingSystem(payload)))
  )
}
