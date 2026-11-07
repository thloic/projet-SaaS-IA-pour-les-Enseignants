import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAgentSystemPrompt } from '../../src/lib/prompts/agent.ts'

const profile = {
  subjects: ['Français'],
  levels: ['7e année'],
  country: 'Canada',
  language: 'fr',
} as const

test('le prompt décrit l’outil de recherche Gmail en lecture seule', () => {
  const prompt = buildAgentSystemPrompt(profile as never)
  assert.ok(prompt.includes('outil de recherche dans le Gmail de l’enseignant'))
  assert.ok(prompt.includes('strictement en lecture'))
})

test('le prompt décrit la relecture avant envoi et interdit l’envoi par le modèle', () => {
  const prompt = buildAgentSystemPrompt(profile as never)
  assert.ok(prompt.includes('prepare_parent_email_send'))
  assert.ok(prompt.includes('Tu n’envoies jamais un courriel toi-même'))
  assert.ok(!prompt.includes('send_gmail'))
})

test('aucune ligne de règle ne commence par un guillemet typographique résiduel', () => {
  const prompt = buildAgentSystemPrompt(profile as never)
  for (const line of prompt.split('\n')) {
    assert.ok(!line.startsWith('‘') && !line.startsWith('’'), `ligne suspecte : ${line.slice(0, 40)}`)
  }
})
