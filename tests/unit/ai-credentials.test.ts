import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

import { anthropicApiKeySchema, saveAICredentialSchema } from '../../src/features/ai-credentials/schemas/aiCredentialSchema.ts'
import { decryptCredential, encryptCredential } from '../../src/features/ai-credentials/server/credentialEncryption.ts'
import { validateAnthropicApiKey } from '../../src/features/ai-credentials/server/anthropicKeyValidation.ts'
import { isAICredentialStorageMissing } from '../../src/features/ai-credentials/server/credentialStorageError.ts'
import { estimateAnthropicCostMicroUsd } from '../../src/features/ai/server/aiCostEstimator.ts'
import { shouldBypassIncludedAIQuota } from '../../src/features/ai/server/aiQuotaPolicy.ts'
import { modelForTask } from '../../src/features/ai/server/aiTaskPolicies.ts'

const MASTER_KEY = Buffer.alloc(32, 7).toString('base64')
const OTHER_KEY = Buffer.alloc(32, 9).toString('base64')
const API_KEY = 'sk-ant-api03-cle-fictive-suffisamment-longue'

test('le schéma accepte une clé Anthropic et refuse les champs supplémentaires', () => {
  assert.equal(anthropicApiKeySchema.safeParse(API_KEY).success, true)
  assert.equal(anthropicApiKeySchema.safeParse('cle-ouverte').success, false)
  assert.equal(saveAICredentialSchema.safeParse({ apiKey: API_KEY, userId: 'interdit' }).success, false)
})

test('la clé est chiffrée en AES-GCM et seule la bonne clé maîtresse peut la relire', () => {
  const encrypted = encryptCredential(API_KEY, MASTER_KEY)
  assert.notEqual(encrypted.encryptedSecret, API_KEY)
  assert.equal(JSON.stringify(encrypted).includes(API_KEY), false)
  assert.equal(decryptCredential(encrypted, MASTER_KEY), API_KEY)
  assert.throws(() => decryptCredential(encrypted, OTHER_KEY))
  assert.throws(() => decryptCredential({ ...encrypted, version: 2 }, MASTER_KEY))
})

test('la validation Anthropic ne transmet que la clé et aucune donnée scolaire', async () => {
  let calls = 0
  const valid = await validateAnthropicApiKey(API_KEY, async (url, init) => {
    calls += 1
    assert.equal(String(url), 'https://api.anthropic.com/v1/models?limit=1')
    assert.equal((init?.headers as Record<string, string>)['x-api-key'], API_KEY)
    assert.equal(init?.body, undefined)
    return Response.json({ data: [] })
  })
  assert.deepEqual(valid, { valid: true })
  assert.equal(calls, 1)

  const invalid = await validateAnthropicApiKey(API_KEY, async () => new Response(null, { status: 401 }))
  assert.deepEqual(invalid, { valid: false, reason: 'INVALID_KEY' })
})

test('une migration absente est reconnue sans ignorer les autres erreurs Supabase', () => {
  assert.equal(isAICredentialStorageMissing({ code: '42P01', message: 'relation does not exist' }), true)
  assert.equal(isAICredentialStorageMissing({ code: 'PGRST205', message: "Could not find the table 'public.user_ai_credentials' in the schema cache" }), true)
  assert.equal(isAICredentialStorageMissing({ code: '42501', message: 'permission denied' }), false)
  assert.equal(isAICredentialStorageMissing({}), false)
})

test('la clé personnelle contourne seulement les quotas de génération Claude', () => {
  assert.equal(shouldBypassIncludedAIQuota('general', true), true)
  assert.equal(shouldBypassIncludedAIQuota('agent', true), true)
  assert.equal(shouldBypassIncludedAIQuota('correction', true), true)
  assert.equal(shouldBypassIncludedAIQuota('agent_audio', true), false)
  assert.equal(shouldBypassIncludedAIQuota('agent_email_send', true), false)
  assert.equal(shouldBypassIncludedAIQuota('agent', false), false)
})

test('le calcul de coût distingue Sonnet et Haiku sans enregistrer le contenu', () => {
  const usage = { inputTokens: 1_000, outputTokens: 200, inputTokenDetails: { cacheReadTokens: 0, cacheWriteTokens: 0 } }
  assert.equal(estimateAnthropicCostMicroUsd('claude-sonnet-4-5', usage), 6_000)
  assert.equal(estimateAnthropicCostMicroUsd('claude-haiku-4-5', usage), 2_000)
})

test('les petites extractions utilisent Haiku et les documents institutionnels Sonnet', () => {
  assert.match(modelForTask('field_extraction'), /haiku/)
  assert.match(modelForTask('translation'), /haiku/)
  assert.match(modelForTask('pat'), /sonnet/)
  assert.match(modelForTask('bulletin'), /sonnet/)
})

test('aucun générateur ne contourne le résolveur Anthropic central', () => {
  const sourceRoot = join(process.cwd(), 'src')
  const violations: string[] = []

  function visit(directory: string) {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name)
      if (statSync(path).isDirectory()) {
        visit(path)
      } else if (/\.(ts|tsx)$/.test(name)) {
        const source = readFileSync(path, 'utf8')
        const allowed = path.endsWith(join('features', 'ai', 'server', 'aiProviderResolver.ts'))
        if (!allowed && (source.includes("from '@ai-sdk/anthropic'") || source.includes('process.env.ANTHROPIC_API_KEY'))) {
          violations.push(path)
        }
      }
    }
  }

  visit(sourceRoot)
  assert.deepEqual(violations, [])
})
