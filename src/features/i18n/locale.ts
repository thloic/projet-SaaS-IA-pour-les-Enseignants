export const APP_LOCALES = ['en', 'fr', 'es'] as const

export type AppLocale = (typeof APP_LOCALES)[number]
export type ContentLanguage = AppLocale

export const DEFAULT_APP_LOCALE: AppLocale = 'en'

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && APP_LOCALES.includes(value as AppLocale)
}

export function normalizeAppLocale(
  value: unknown,
  fallback: AppLocale = DEFAULT_APP_LOCALE
): AppLocale {
  return isAppLocale(value) ? value : fallback
}

export function languageLabel(language: ContentLanguage): string {
  if (language === 'es') return 'espagnol international'
  if (language === 'en') return 'anglais'
  return 'français'
}

export function intlLocale(locale: AppLocale): string {
  if (locale === 'es') return 'es-ES'
  if (locale === 'fr') return 'fr-FR'
  return 'en-US'
}
