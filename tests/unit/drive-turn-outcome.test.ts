import assert from 'node:assert/strict'
import test from 'node:test'
import { decideDriveTurnOutcome } from '../../src/features/agent/server/driveTurnOutcome.ts'
import { buildAgentRequestMessages } from '../../src/features/agent/utils/conversationState.ts'
import type { ChatMessage } from '../../src/features/agent/types/conversation.types.ts'

const proposal = {
  status: 'proposal',
  change: { type: 'update_doc', fileId: 'abcdefghij_KLM', text: 'Texte proposé' },
  targetName: 'Gabarit lettre',
  webViewLink: null,
}

test('tour Drive : une proposition est trouvée même après du texte (non streamé)', () => {
  const outcome = decideDriveTurnOutcome([
    { toolName: 'drive_search', output: { status: 'ok', files: [] } },
    { toolName: 'drive_propose_change', output: proposal },
  ])
  assert.equal(outcome.kind, 'proposal')
})

test('tour Drive : une connexion manquante prime sur une proposition', () => {
  const outcome = decideDriveTurnOutcome([
    { toolName: 'drive_propose_change', output: proposal },
    { toolName: 'drive_search', output: { status: 'needs_connection', feature: 'drive' } },
  ])
  assert.deepEqual(outcome, { kind: 'needs_connection', output: { status: 'needs_connection', feature: 'drive' } })
})

test('tour Drive : erreur ou lecture seule sans proposition → texte', () => {
  assert.equal(decideDriveTurnOutcome([{ toolName: 'drive_read', output: { status: 'ok' } }]).kind, 'text')
  assert.equal(
    decideDriveTurnOutcome([{ toolName: 'drive_propose_change', output: { status: 'error', reason: 'CHANGE_UNSUPPORTED' } }]).kind,
    'text'
  )
  assert.equal(decideDriveTurnOutcome([]).kind, 'text')
})

test('historique : la proposition affichée est transmise au modèle avec son fileId et son texte', () => {
  const card: ChatMessage = {
    id: 'a1',
    kind: 'drive_change_proposal',
    role: 'assistant',
    message: 'Voici la modification proposée.',
    change: { type: 'update_doc', fileId: 'abcdefghij_KLM', text: 'Texte proposé' },
    targetName: 'Gabarit lettre',
    webViewLink: null,
  }
  const messages = buildAgentRequestMessages([card], 'Modifie aussi le titre')
  assert.equal(messages.length, 2)
  assert.equal(messages[0]?.role, 'assistant')
  assert.match(messages[0]?.content ?? '', /abcdefghij_KLM/)
  assert.match(messages[0]?.content ?? '', /Texte proposé/)
})

test('historique : une proposition très longue reste sous la limite de 8000 caractères du schéma', () => {
  const card: ChatMessage = {
    id: 'a2',
    kind: 'drive_change_proposal',
    role: 'assistant',
    message: 'x',
    change: { type: 'create_doc', name: 'Long', text: 'a'.repeat(50_000) },
    targetName: 'Long',
    webViewLink: null,
  }
  const [history] = buildAgentRequestMessages([card], 'suite')
  assert.ok((history?.content.length ?? 0) <= 8000)
})
