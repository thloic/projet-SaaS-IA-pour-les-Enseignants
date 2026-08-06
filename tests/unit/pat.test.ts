import assert from 'node:assert/strict'
import test from 'node:test'

import { patMock } from '../../src/features/agent/mocks/patMock.ts'
import { PATSchema } from '../../src/features/agent/schemas/patSchema.ts'

test('patMock respecte le schéma PAT final', () => {
  const result = PATSchema.safeParse(patMock)

  assert.equal(result.success, true)
})
