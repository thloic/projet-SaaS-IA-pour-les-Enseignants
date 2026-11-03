import assert from 'node:assert/strict'
import test from 'node:test'

import {
  orchestrateGmailSearch,
  GmailSearchOrchestrationError,
} from '../../src/features/agent/server/gmailSearchOrchestration.ts'
import { GoogleAccessTokenError } from '../../src/features/integrations/google/server/googleAccessToken.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'

function baseInput(overrides: Partial<Parameters<typeof orchestrateGmailSearch>[0]> = {}) {
  return {
    userId: USER_ID,
    query: 'de:parent@example.com',
    ...overrides,
  }
}

function baseDependencies(overrides: Partial<Parameters<typeof orchestrateGmailSearch>[1]> = {}) {
  return {
    getAccessToken: async () => 'valid-access-token',
    searchGmail: async () => [],
    ...overrides,
  }
}

test('Gmail non connecté (lecture) : erreur dédiée, aucune recherche tentée', async () => {
  let searchCalls = 0

  await assert.rejects(
    () =>
      orchestrateGmailSearch(
        baseInput(),
        baseDependencies({
          getAccessToken: async () => {
            throw new GoogleAccessTokenError('GOOGLE_NOT_CONNECTED')
          },
          searchGmail: async () => {
            searchCalls += 1
            return []
          },
        })
      ),
    (error: unknown) =>
      error instanceof GmailSearchOrchestrationError && error.code === 'GOOGLE_NOT_CONNECTED'
  )

  assert.equal(searchCalls, 0)
})

test('scope de lecture manquant (envoi connecté mais pas lecture) : erreur dédiée', async () => {
  await assert.rejects(
    () =>
      orchestrateGmailSearch(
        baseInput(),
        baseDependencies({
          getAccessToken: async () => {
            throw new GoogleAccessTokenError('GOOGLE_SCOPE_MISSING')
          },
        })
      ),
    (error: unknown) =>
      error instanceof GmailSearchOrchestrationError && error.code === 'GOOGLE_SCOPE_MISSING'
  )
})

test('échec de la recherche Gmail : erreur dédiée, pas de fuite de l’erreur brute', async () => {
  await assert.rejects(
    () =>
      orchestrateGmailSearch(
        baseInput(),
        baseDependencies({
          searchGmail: async () => {
            throw new Error('échec simulé')
          },
        })
      ),
    (error: unknown) =>
      error instanceof GmailSearchOrchestrationError && error.code === 'GMAIL_SEARCH_FAILED'
  )
})

test('recherche réussie : jeton transmis, requête transmise telle quelle, résultats renvoyés', async () => {
  let receivedSearch: { accessToken: string; query: string } | null = null

  const result = await orchestrateGmailSearch(
    baseInput({ query: 'absences Marie' }),
    baseDependencies({
      getAccessToken: async () => 'token-abc',
      searchGmail: async (input) => {
        receivedSearch = input
        return [{ id: 'msg-1', from: 'parent@example.com', subject: 'Absence', date: null, snippet: 'Bonjour...' }]
      },
    })
  )

  assert.deepEqual(receivedSearch, { accessToken: 'token-abc', query: 'absences Marie' })
  assert.deepEqual(result, [
    { id: 'msg-1', from: 'parent@example.com', subject: 'Absence', date: null, snippet: 'Bonjour...' },
  ])
})
