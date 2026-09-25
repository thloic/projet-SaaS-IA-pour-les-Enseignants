import assert from 'node:assert/strict'
import test from 'node:test'

import { examVariantGenerationInputSchema } from '../../src/features/adaptation/schemas/examVariantSchema.ts'

test('valide les données de la page de variantes A/B/C', () => {
  const parsed = examVariantGenerationInputSchema.safeParse({
    sourceTitle: 'Fractions',
    subject: 'Mathématiques',
    level: '8e année',
    sourceContent: '1. Additionne les fractions suivantes et explique ta démarche.',
  })
  assert.equal(parsed.success, true)
})

test('refuse une source vide avant tout appel IA', () => {
  assert.equal(examVariantGenerationInputSchema.safeParse({
    sourceTitle: 'Fractions', subject: 'Mathématiques', level: '8e année', sourceContent: 'vide',
  }).success, false)
})
