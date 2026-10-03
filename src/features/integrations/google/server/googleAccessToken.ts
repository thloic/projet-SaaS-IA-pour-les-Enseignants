// Isole la logique "faut-il rafraichir ?" de l'appel reseau/BD reel, pour la
// rendre testable avec des dependances injectees (meme discipline que les
// orchestrations de l'agent).
const EXPIRY_SAFETY_MARGIN_MS = 60_000

export interface GoogleAccessTokenDependencies {
  getCredentials(userId: string): Promise<{
    scopes: string[]
    accessToken: string
    refreshToken: string
    expiresAt: string
  } | null>
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }>
  saveRefreshedToken(userId: string, accessToken: string, expiresAt: string): Promise<void>
  now?(): Date
}

export type GoogleAccessTokenErrorCode = 'GOOGLE_NOT_CONNECTED' | 'GOOGLE_SCOPE_MISSING'

export class GoogleAccessTokenError extends Error {
  readonly code: GoogleAccessTokenErrorCode

  constructor(code: GoogleAccessTokenErrorCode) {
    super(code)
    this.name = 'GoogleAccessTokenError'
    this.code = code
  }
}

export async function getValidGoogleAccessToken(
  userId: string,
  requiredScope: string,
  dependencies: GoogleAccessTokenDependencies
): Promise<string> {
  const credentials = await dependencies.getCredentials(userId)
  if (!credentials) throw new GoogleAccessTokenError('GOOGLE_NOT_CONNECTED')
  if (!credentials.scopes.includes(requiredScope)) throw new GoogleAccessTokenError('GOOGLE_SCOPE_MISSING')

  const now = dependencies.now?.() ?? new Date()
  const expiresAt = new Date(credentials.expiresAt)
  if (expiresAt.getTime() - EXPIRY_SAFETY_MARGIN_MS > now.getTime()) {
    return credentials.accessToken
  }

  const refreshed = await dependencies.refreshAccessToken(credentials.refreshToken)
  await dependencies.saveRefreshedToken(userId, refreshed.accessToken, refreshed.expiresAt)
  return refreshed.accessToken
}
