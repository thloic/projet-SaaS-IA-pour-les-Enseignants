const AUTH_ERROR_MESSAGES = {
  callback:
    "La connexion n'a pas pu être finalisée. Réessayez dans quelques instants ou utilisez le lien magique.",
  configuration:
    "La connexion est momentanément indisponible. Notre équipe doit finaliser la configuration d'authentification.",
  email:
    "Impossible d'envoyer le lien de connexion pour le moment. Réessayez dans quelques instants.",
  google:
    "Impossible de lancer la connexion Google pour le moment. Réessayez dans quelques instants ou utilisez le lien magique.",
  unknown:
    "La connexion a échoué. Réessayez dans quelques instants.",
}

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase()
}

export function getAuthErrorMessage(error?: {
  message?: string
  code?: string
  name?: string
} | null) {
  const message = normalize(error?.message)
  const code = normalize(error?.code)
  const name = normalize(error?.name)
  const haystack = `${message} ${code} ${name}`

  if (
    haystack.includes('database error saving new user') ||
    haystack.includes('unexpected_failure') ||
    haystack.includes('server_error')
  ) {
    return AUTH_ERROR_MESSAGES.configuration
  }

  if (
    haystack.includes('email') ||
    haystack.includes('otp') ||
    haystack.includes('rate limit') ||
    haystack.includes('over_email_send_rate_limit')
  ) {
    return AUTH_ERROR_MESSAGES.email
  }

  if (haystack.includes('google') || haystack.includes('oauth')) {
    return AUTH_ERROR_MESSAGES.google
  }

  return AUTH_ERROR_MESSAGES.unknown
}

export function getAuthCallbackErrorMessage(search: string, hash: string) {
  const searchParams = new URLSearchParams(search)
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
  const errorCode = hashParams.get('error_code') ?? searchParams.get('error_code')
  const error = hashParams.get('error') ?? searchParams.get('error')
  const description =
    hashParams.get('error_description') ?? searchParams.get('error_description')

  if (!error && !errorCode && searchParams.get('error') !== 'auth') {
    return null
  }

  return getAuthErrorMessage({
    code: errorCode ?? error ?? undefined,
    message: description ?? AUTH_ERROR_MESSAGES.callback,
  })
}
