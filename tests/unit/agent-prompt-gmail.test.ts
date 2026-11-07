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

test('aucune règle du prompt n’est une chaîne cassée par des guillemets typographiques', () => {
  const prompt = buildAgentSystemPrompt(profile as never)
  // Une ligne de règle commence par « - » ; elle ne doit jamais contenir de
  // délimiteur typographique résiduel en début ou fin de ligne de code (ici
  // on vérifie le rendu : aucune ligne de règle ne commence par un guillemet).
  for (const line of prompt.split('\n')) {
    assert.ok(!line.startsWith('‘') && !line.startsWith('’'), `ligne suspecte : ${line.slice(0, 40)}`)
  }
})
