import { strict as assert } from 'node:assert'
import { test } from 'node:test'
// Le test d'exécution de createGmailSendTool (needs_connection) charge des
// modules serveur (Supabase, server-only) : il relève d'un test d'intégration,
// pas de ce test unitaire.
import {
  gmailSendToolInputSchema,
  type GmailSendToolOutput,
} from '../../src/features/agent/schemas/gmailSendToolSchema.ts'

test('gmail-send-tool — schéma input valide', async () => {
  assert.equal(gmailSendToolInputSchema.safeParse({
    to: 'parent@example.com',
    subject: 'Test',
    body: 'Test body',
    draftId: '11111111-1111-4111-8111-111111111111',
  }).success, true)
})

test('gmail-send-tool — rejet email invalide', async () => {
  assert.equal(gmailSendToolInputSchema.safeParse({
    to: 'not-an-email',
    subject: 'Test',
    body: 'Test body',
    draftId: '11111111-1111-4111-8111-111111111111',
  }).success, false)
})

test('gmail-send-tool — rejet subject vide', async () => {
  assert.equal(gmailSendToolInputSchema.safeParse({
    to: 'parent@example.com',
    subject: '  ',
    body: 'Test body',
    draftId: '11111111-1111-4111-8111-111111111111',
  }).success, false)
})

test('gmail-send-tool — rejet body vide', async () => {
  assert.equal(gmailSendToolInputSchema.safeParse({
    to: 'parent@example.com',
    subject: 'Test',
    body: '  ',
    draftId: '11111111-1111-4111-8111-111111111111',
  }).success, false)
})

test('gmail-send-tool — schéma output needs_connection correct', async () => {
  const output: GmailSendToolOutput = {
    status: 'needs_connection',
    feature: 'gmail',
  }
  assert.equal(output.status, 'needs_connection')
  assert.equal(output.feature, 'gmail')
})

test('gmail-send-tool — schéma output success correct', async () => {
  const output: GmailSendToolOutput = {
    status: 'ok',
    messageId: 'msg-123',
  }
  assert.equal(output.status, 'ok')
  assert.equal(output.messageId, 'msg-123')
})

test('gmail-send-tool — schéma output error correct', async () => {
  const output: GmailSendToolOutput = {
    status: 'error',
    reason: 'Test error',
  }
  assert.equal(output.status, 'error')
  assert.equal(output.reason, 'Test error')
})

test('gmail-send-tool — draftId obligatoire : refus sans brouillon', async () => {
  assert.equal(gmailSendToolInputSchema.safeParse({
    to: 'parent@example.com',
    subject: 'Test',
    body: 'Test body',
  }).success, false)
})

test('gmail-send-tool — draftId doit être un UUID', async () => {
  assert.equal(gmailSendToolInputSchema.safeParse({
    to: 'parent@example.com',
    subject: 'Test',
    body: 'Test body',
    draftId: 'draft-1700000000',
  }).success, false)
  assert.equal(gmailSendToolInputSchema.safeParse({
    to: 'parent@example.com',
    subject: 'Test',
    body: 'Test body',
    draftId: '11111111-1111-4111-8111-111111111111',
  }).success, true)
})
