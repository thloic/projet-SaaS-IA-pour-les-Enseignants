import assert from 'node:assert/strict'
import test from 'node:test'

import {
  agentChatRequestSchema,
  agentMessageSchema,
} from '../../src/features/agent/schemas/agentSchema.ts'
import { buildAgentSystemPrompt } from '../../src/lib/prompts/agent.ts'
import type { StudentContext } from '../../src/features/agent/types/memory.types.ts'

test('agentMessageSchema accepts a valid message and rejects empty content or bad role', () => {
  assert.equal(
    agentMessageSchema.safeParse({ role: 'user', content: 'Bonjour' }).success,
    true
  )
  assert.equal(agentMessageSchema.safeParse({ role: 'user', content: '' }).success, false)
  assert.equal(
    agentMessageSchema.safeParse({ role: 'system', content: 'texte' }).success,
    false
  )
})

test('agentChatRequestSchema requires at least one message and caps the list', () => {
  assert.equal(
    agentChatRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'Bonjour' }],
    }).success,
    true
  )
  assert.equal(agentChatRequestSchema.safeParse({ messages: [] }).success, false)

  const tooMany = Array.from({ length: 51 }, () => ({ role: 'user' as const, content: 'x' }))
  assert.equal(agentChatRequestSchema.safeParse({ messages: tooMany }).success, false)
})

test('buildAgentSystemPrompt injects the teacher profile silently and enforces the core rules', () => {
  const prompt = buildAgentSystemPrompt({
    subjects: ['Français'],
    levels: ['Secondaire 2'],
    country: 'Canada - Québec',
    language: 'fr',
  })

  assert.match(prompt, /français canadien/i)
  assert.match(prompt, /Français/)
  assert.match(prompt, /Secondaire 2/)
  assert.match(prompt, /Canada - Québec/)
  assert.match(prompt, /jamais de formulation négative/i)
  assert.match(prompt, /n’inventes jamais/i)
  assert.match(prompt, /ne mélanges jamais/i)
})

test('buildAgentSystemPrompt omits empty profile fields instead of leaving blank lines', () => {
  const prompt = buildAgentSystemPrompt({ language: 'en' })

  assert.match(prompt, /anglais/i)
  assert.doesNotMatch(prompt, /Matière\(s\) : $/m)
})

test('buildAgentSystemPrompt omits the student section when no student is mentioned', () => {
  const prompt = buildAgentSystemPrompt({ language: 'fr' })

  assert.doesNotMatch(prompt, /DOSSIER DE L’ÉLÈVE MENTIONNÉ/)
})

test('buildAgentSystemPrompt injects the mentioned student’s real record when provided', () => {
  const context: StudentContext = {
    kind: 'context',
    student: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      firstName: 'Loïc',
      lastName: 'Martin',
      fullName: 'Loïc Martin',
      sex: 'M',
      familyLanguage: 'fr',
      needs: [],
      institutionalAdaptations: [],
      interventionPlan: false,
      generalNotes: '',
    },
    classes: [{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Classe 8A', level: '8e année', subject: 'Français', documentTemplate: null, documentTemplatePath: null }],
    observations: [
      { id: 'o1', sessionId: null, category: 'progress', tag: 'Progrès visible', note: 'Répond bien en classe.', createdAt: '2026-02-10T10:00:00.000Z' },
    ],
    participations: [],
    attendance: [],
    contentVariants: [],
    evaluationResults: [
      { id: 'e1', classId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', title: 'Contrôle', grade: '16/20', createdAt: '2026-02-12T10:00:00.000Z' },
    ],
  }

  const prompt = buildAgentSystemPrompt({ language: 'fr' }, context)

  assert.match(prompt, /DOSSIER DE L’ÉLÈVE MENTIONNÉ : Loïc Martin/)
  assert.match(prompt, /16\/20/)
  assert.match(prompt, /Répond bien en classe/)
  assert.match(prompt, /base ta réponse uniquement sur les informations ci-dessus/i)
})
