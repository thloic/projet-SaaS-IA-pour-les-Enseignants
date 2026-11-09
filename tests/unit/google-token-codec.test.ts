import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { openGoogleToken, sealGoogleToken } from '../../src/features/integrations/google/server/googleTokenCodec.ts'

// Clé de test jetable (32 octets en hex), jamais la clé réelle.
const TEST_KEY = randomBytes(32).toString('hex')
const ACCESS_TOKEN = 'ya29.a0AfB_test_access_token_value'

test('un jeton Google scellé ne contient jamais le jeton en clair', () => {
  const sealed = sealGoogleToken(ACCESS_TOKEN, TEST_KEY)
  const serialized = JSON.stringify(sealed)

  assert.equal(serialized.includes(ACCESS_TOKEN), false)
  assert.equal(serialized.includes('ya29'), false)
  assert.equal(sealed.version, 1)
})

test('le jeton scellé se déchiffre à l’identique avec la bonne clé', () => {
  const sealed = sealGoogleToken(ACCESS_TOKEN, TEST_KEY)
  assert.equal(openGoogleToken(sealed, TEST_KEY), ACCESS_TOKEN)
})

test('un jeton scellé refuse de se déchiffrer avec une autre clé', () => {
  const sealed = sealGoogleToken(ACCESS_TOKEN, TEST_KEY)
  const otherKey = randomBytes(32).toString('hex')
  assert.throws(() => openGoogleToken(sealed, otherKey))
})

test('deux scellements du même jeton produisent des valeurs différentes (IV aléatoire)', () => {
  const first = sealGoogleToken(ACCESS_TOKEN, TEST_KEY)
  const second = sealGoogleToken(ACCESS_TOKEN, TEST_KEY)
  assert.notEqual(first.iv, second.iv)
  assert.notEqual(first.encryptedSecret, second.encryptedSecret)
})
