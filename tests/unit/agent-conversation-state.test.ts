import assert from 'node:assert/strict'
import test from 'node:test'

import {
  appendPendingTurn,
  buildAgentRequestMessages,
  buildClarificationContinuation,
  updateAssistantText,
} from '../../src/features/agent/utils/conversationState.ts'
import { patMock } from '../../src/features/agent/mocks/patMock.ts'
import { followUpPlanMock } from '../../src/features/agent/mocks/followUpPlanMock.ts'
import type { ChatMessage } from '../../src/features/agent/types/conversation.types.ts'

const messages: ChatMessage[] = [
  { id: 'u1', kind: 'text', role: 'user', content: 'Génère un PAT.', status: 'complete' },
  {
    id: 'pat1',
    kind: 'pat',
    role: 'assistant',
    studentId: '11111111-1111-4111-8111-111111111111',
    language: 'fr',
    pat: patMock,
  },
]

test('un nouveau tour conserve les cartes structurées déjà affichées', () => {
  const next = appendPendingTurn(messages, 'Explique le premier objectif.', 'u2', 'a2')
  assert.equal(next.length, 4)
  assert.equal(next[1]?.kind, 'pat')
  assert.equal(next[2]?.kind, 'text')
  assert.equal(next[3]?.kind, 'text')
})

test('une carte de plan de suivi survit à plusieurs tours suivants', () => {
  const planItems = followUpPlanMock.items
  const withPlan: ChatMessage[] = [
    ...messages,
    {
      id: 'plan1',
      kind: 'follow_up_plan',
      role: 'assistant',
      studentId: '11111111-1111-4111-8111-111111111111',
      items: planItems,
    },
  ]

  const afterFirstTurn = appendPendingTurn(withPlan, 'Merci, ajuste le délai.', 'u2', 'a2')
  const afterSecondTurn = appendPendingTurn(afterFirstTurn, 'Encore une précision.', 'u3', 'a3')

  const planMessage = afterSecondTurn.find((message) => message.id === 'plan1')
  assert.equal(planMessage?.kind, 'follow_up_plan')
  if (planMessage?.kind === 'follow_up_plan') {
    assert.deepEqual(planMessage.items, planItems)
  }
})

test('la requête serveur contient seulement l’historique texte et le nouveau message', () => {
  assert.deepEqual(buildAgentRequestMessages(messages, 'Question suivante'), [
    { role: 'user', content: 'Génère un PAT.' },
    { role: 'user', content: 'Question suivante' },
  ])
})

test('une réponse interrompue conserve le texte déjà reçu', () => {
  const withPending = appendPendingTurn([], 'Question', 'u1', 'a1')
  const interrupted = updateAssistantText(withPending, 'a1', 'Début de réponse', 'interrupted')
  assert.equal(interrupted[1]?.kind, 'text')
  if (interrupted[1]?.kind === 'text') {
    assert.equal(interrupted[1].content, 'Début de réponse')
    assert.equal(interrupted[1].status, 'interrupted')
  }
})

test('le choix après ambiguïté reprend la demande originale sans la transformer en PAT', () => {
  const continuation = buildClarificationContinuation(
    'Combien d’absences a Marie ?',
    'Marie Martin',
    'fr'
  )
  assert.match(continuation, /Combien d’absences a Marie/)
  assert.match(continuation, /Marie Martin/)
  assert.doesNotMatch(continuation, /PAT/)
})

test('le choix d’élève après une ambiguïté PAT conserve explicitement l’intention PAT', () => {
  assert.equal(
    buildClarificationContinuation('Génère le PAT de Marie', 'Marie Martin', 'fr'),
    'Génère le PAT de Marie Martin'
  )
})
