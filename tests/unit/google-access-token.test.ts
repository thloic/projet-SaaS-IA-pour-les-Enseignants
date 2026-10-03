import assert from 'node:assert/strict'
import test from 'node:test'

import {
  GoogleAccessTokenError,
  getValidGoogleAccessToken,
} from '../../src/features/integrations/google/server/googleAccessToken.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const SCOPE = 'https://www.googleapis.com/auth/gmail.send'

test('aucune connexion enregistrée : GOOGLE_NOT_CONNECTED, aucun rafraîchissement tenté', async () => {
  let refreshCalls = 0

  await assert.rejects(
    () =>
      getValidGoogleAccessToken(USER_ID, SCOPE, {
        getCredentials: async () => null,
        refreshAccessToken: async () => {
          refreshCalls += 1
          return { accessToken: 'x', expiresAt: new Date().toISOString() }
        },
        saveRefreshedToken: async () => {},
      }),
    (error: unknown) => error instanceof GoogleAccessTokenError && error.code === 'GOOGLE_NOT_CONNECTED'
  )

  assert.equal(refreshCalls, 0)
})

test('connexion existante sans le scope requis : GOOGLE_SCOPE_MISSING', async () => {
  await assert.rejects(
    () =>
      getValidGoogleAccessToken(USER_ID, SCOPE, {
        getCredentials: async () => ({
          scopes: ['https://www.googleapis.com/auth/drive.file'],
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        }),
        refreshAccessToken: async () => ({ accessToken: 'x', expiresAt: new Date().toISOString() }),
        saveRefreshedToken: async () => {},
      }),
    (error: unknown) => error instanceof GoogleAccessTokenError && error.code === 'GOOGLE_SCOPE_MISSING'
  )
})

test('jeton encore valide (hors marge de sécurité) : réutilisé tel quel, aucun rafraîchissement', async () => {
  let refreshCalls = 0
  const now = new Date('2026-01-01T12:00:00.000Z')

  const token = await getValidGoogleAccessToken(USER_ID, SCOPE, {
    getCredentials: async () => ({
      scopes: [SCOPE],
      accessToken: 'still-valid',
      refreshToken: 'refresh',
      expiresAt: new Date('2026-01-01T12:10:00.000Z').toISOString(),
    }),
    refreshAccessToken: async () => {
      refreshCalls += 1
      return { accessToken: 'new', expiresAt: new Date().toISOString() }
    },
    saveRefreshedToken: async () => {},
    now: () => now,
  })

  assert.equal(token, 'still-valid')
  assert.equal(refreshCalls, 0)
})

test('jeton expiré (ou dans la marge de sécurité) : rafraîchi puis sauvegardé', async () => {
  const now = new Date('2026-01-01T12:00:00.000Z')
  let savedUserId: string | undefined
  let savedToken: string | undefined

  const token = await getValidGoogleAccessToken(USER_ID, SCOPE, {
    getCredentials: async () => ({
      scopes: [SCOPE],
      accessToken: 'expired',
      refreshToken: 'refresh-token',
      expiresAt: new Date('2026-01-01T12:00:30.000Z').toISOString(),
    }),
    refreshAccessToken: async (refreshToken) => {
      assert.equal(refreshToken, 'refresh-token')
      return { accessToken: 'refreshed', expiresAt: '2026-01-01T13:00:00.000Z' }
    },
    saveRefreshedToken: async (userId, accessToken) => {
      savedUserId = userId
      savedToken = accessToken
    },
    now: () => now,
  })

  assert.equal(token, 'refreshed')
  assert.equal(savedUserId, USER_ID)
  assert.equal(savedToken, 'refreshed')
})
