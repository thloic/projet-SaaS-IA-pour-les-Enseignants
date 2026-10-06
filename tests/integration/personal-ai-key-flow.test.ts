import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { decryptCredential, encryptCredential } from '../../src/features/ai-credentials/server/credentialEncryption.ts'
import { shouldBypassIncludedAIQuota } from '../../src/features/ai/server/aiQuotaPolicy.ts'

const MASTER_KEY = Buffer.alloc(32, 4).toString('base64')

test('gratuit avec clé personnelle : génération autorisée sans consommer le quota inclus', () => {
  const stored = encryptCredential('sk-ant-api03-cle-personnelle-fictive', MASTER_KEY)
  const resolvedKey = decryptCredential(stored, MASTER_KEY)
  const includedUsageBefore = 3
  const bypass = shouldBypassIncludedAIQuota('agent', Boolean(resolvedKey))
  const includedUsageAfter = bypass ? includedUsageBefore : includedUsageBefore + 1

  assert.equal(bypass, true)
  assert.equal(includedUsageAfter, 3)
})

test('sans clé personnelle : le quota EducAssist reste appliqué', () => {
  assert.equal(shouldBypassIncludedAIQuota('agent', false), false)
})

test('une clé d’un enseignant ne peut pas être déchiffrée avec une autre clé maîtresse', () => {
  const encryptedForTeacherA = encryptCredential(
    'sk-ant-api03-cle-fictive-enseignant-a',
    MASTER_KEY
  )
  const unrelatedKey = Buffer.alloc(32, 8).toString('base64')
  assert.throws(() => decryptCredential(encryptedForTeacherA, unrelatedKey))
})

test('la migration isole les clés et la télémétrie par utilisateur avec RLS', () => {
  const migration = readFileSync(
    new URL('../../supabase/migrations/036_user_ai_credentials.sql', import.meta.url),
    'utf8'
  )
  assert.match(migration, /alter table public\.user_ai_credentials enable row level security/)
  assert.match(migration, /auth\.uid\(\) = user_id/g)
  assert.match(migration, /user_id uuid not null unique references auth\.users/)
  assert.match(migration, /alter table public\.ai_usage_events enable row level security/)
})
