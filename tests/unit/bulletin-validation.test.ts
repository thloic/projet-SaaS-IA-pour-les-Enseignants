import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BulletinValidationError,
  parseAndValidateBulletinDraft,
  stripJsonCodeFence,
} from '../../src/features/bulletin/server/bulletinValidation.ts'

test('assemble deux points forts et une prochaine étape en un seul commentaire', () => {
  const result = parseAndValidateBulletinDraft(
    JSON.stringify({
      strengths: [
        'Il participe activement aux discussions de groupe.',
        'Elle maîtrise bien les additions à deux chiffres.',
      ],
      nextStep: 'La prochaine étape consiste à consolider les soustractions avec retenue.',
    })
  )

  assert.equal(
    result.comment,
    'Il participe activement aux discussions de groupe. Elle maîtrise bien les additions à deux chiffres. La prochaine étape consiste à consolider les soustractions avec retenue.'
  )
})

test('retire les blocs de code markdown avant de parser le JSON', () => {
  assert.equal(stripJsonCodeFence('```json\n{"a":1}\n```'), '{"a":1}')
  assert.equal(stripJsonCodeFence('{"a":1}'), '{"a":1}')
})

test('rejette un nombre de points forts différent de deux', () => {
  assert.throws(
    () =>
      parseAndValidateBulletinDraft(
        JSON.stringify({ strengths: ['Un seul point fort.'], nextStep: 'Prochaine étape.' })
      ),
    (error: unknown) => error instanceof BulletinValidationError
  )

  assert.throws(
    () =>
      parseAndValidateBulletinDraft(
        JSON.stringify({
          strengths: ['Un.', 'Deux.', 'Trois.'],
          nextStep: 'Prochaine étape.',
        })
      ),
    (error: unknown) => error instanceof BulletinValidationError
  )
})

test('rejette un JSON invalide', () => {
  assert.throws(
    () => parseAndValidateBulletinDraft('{"strengths":'),
    (error: unknown) => error instanceof BulletinValidationError
  )
})

test('rejette une formulation négative directe dans un point fort ou la prochaine étape', () => {
  assert.throws(
    () =>
      parseAndValidateBulletinDraft(
        JSON.stringify({
          strengths: ['Il est incapable de se concentrer.', 'Second point fort.'],
          nextStep: 'Prochaine étape.',
        })
      ),
    (error: unknown) => error instanceof BulletinValidationError
  )

  assert.throws(
    () =>
      parseAndValidateBulletinDraft(
        JSON.stringify({
          strengths: ['Premier point fort.', 'Second point fort.'],
          nextStep: 'Elle échoue systématiquement en géométrie.',
        })
      ),
    (error: unknown) => error instanceof BulletinValidationError
  )
})
