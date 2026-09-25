import assert from 'node:assert/strict'
import test from 'node:test'

import { toAgentPlainText } from '../../src/features/agent/utils/plainText.ts'

test('retire le gras Markdown des réponses de l’agent', () => {
  assert.equal(
    toAgentPlainText('**Résumé** : Jesse progresse en **lecture**.'),
    'Résumé : Jesse progresse en lecture.'
  )
})

test('retire aussi les titres et le code en ligne', () => {
  assert.equal(toAgentPlainText('## Suite\nUtilisez `ce document`.'), 'Suite\nUtilisez ce document.')
})
