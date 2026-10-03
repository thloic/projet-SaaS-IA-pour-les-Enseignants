import assert from 'node:assert/strict'
import test from 'node:test'

import { agentWorkspaceTranslations } from '../../src/features/agent/i18n/agentWorkspaceTranslations.ts'

test('l’accueil premium propose les mêmes actions utiles dans les trois langues', () => {
  const expectedActions = ['student', 'pat', 'bulletin', 'results', 'observation', 'content']

  for (const locale of ['fr', 'en', 'es'] as const) {
    const copy = agentWorkspaceTranslations[locale]
    assert.deepEqual(copy.actions.map((action) => action.id), expectedActions)
    assert.equal(copy.actions.every((action) => action.title.trim().length > 0), true)
    assert.equal(copy.actions.every((action) => action.description.trim().length > 0), true)
    assert.equal(copy.actions.every((action) => action.prompt.trim().length > 0), true)
  }
})

test('l’interface rappelle la protection des dossiers et la validation enseignante', () => {
  for (const copy of Object.values(agentWorkspaceTranslations)) {
    assert.ok(copy.protectedDataDescription.length > 10)
    assert.ok(copy.humanValidationDescription.length > 10)
    assert.ok(copy.contextDescription.length > 10)
  }
})
