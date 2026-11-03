import { GoogleAccessTokenError } from '../../integrations/google/server/googleAccessToken.ts'
import type { GmailSearchMessage } from '../../integrations/google/server/searchGmailMessages.ts'

export type GmailSearchOrchestrationErrorCode =
  | 'GOOGLE_NOT_CONNECTED'
  | 'GOOGLE_SCOPE_MISSING'
  | 'GMAIL_SEARCH_FAILED'

export class GmailSearchOrchestrationError extends Error {
  readonly code: GmailSearchOrchestrationErrorCode

  constructor(code: GmailSearchOrchestrationErrorCode) {
    super(code)
    this.name = 'GmailSearchOrchestrationError'
    this.code = code
  }
}

export interface GmailSearchOrchestrationDependencies {
  getAccessToken(userId: string): Promise<string>
  searchGmail(input: { accessToken: string; query: string }): Promise<GmailSearchMessage[]>
}

// Recherche en lecture seule, dans la boite du seul enseignant connecte pour
// cette requete. Rien de ce qui est retourne ici n'est jamais persiste ni mis
// en cache cote serveur au-dela de la duree de la requete (meme regle que
// deja appliquee a Drive — voir docs/PRD-agent-envoi-gmail-drive.md).
export async function orchestrateGmailSearch(
  input: { userId: string; query: string },
  dependencies: GmailSearchOrchestrationDependencies
): Promise<GmailSearchMessage[]> {
  let accessToken: string
  try {
    accessToken = await dependencies.getAccessToken(input.userId)
  } catch (error) {
    if (error instanceof GoogleAccessTokenError && error.code === 'GOOGLE_NOT_CONNECTED') {
      throw new GmailSearchOrchestrationError('GOOGLE_NOT_CONNECTED')
    }
    if (error instanceof GoogleAccessTokenError && error.code === 'GOOGLE_SCOPE_MISSING') {
      throw new GmailSearchOrchestrationError('GOOGLE_SCOPE_MISSING')
    }
    console.error('[agent:gmail-search] jeton Google indisponible', error)
    throw new GmailSearchOrchestrationError('GMAIL_SEARCH_FAILED')
  }

  try {
    return await dependencies.searchGmail({ accessToken, query: input.query })
  } catch (error) {
    console.error('[agent:gmail-search] echec de la recherche', error)
    throw new GmailSearchOrchestrationError('GMAIL_SEARCH_FAILED')
  }
}
