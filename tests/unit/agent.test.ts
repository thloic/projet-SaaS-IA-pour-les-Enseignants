import assert from 'node:assert/strict'
import test from 'node:test'

import {
  agentChatRequestSchema,
  agentMessageSchema,
} from '../../src/features/agent/schemas/agentSchema.ts'
import { buildAgentSystemPrompt } from '../../src/lib/prompts/agent.ts'

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
