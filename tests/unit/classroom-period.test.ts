import assert from 'node:assert/strict'
import test from 'node:test'
import { classroomPeriodBounds } from '../../src/features/classroom/utils/classroomPeriod.ts'

test('fenêtre inclusive de 30 jours, changement de mois et exclusion des jours futurs', () => {
  assert.deepEqual(classroomPeriodBounds('30d', new Date('2026-09-09T23:59:00Z')), { start: '2026-08-11', end: '2026-09-09' })
  assert.deepEqual(classroomPeriodBounds('30d', new Date('2024-03-01T00:00:00Z')), { start: '2024-02-01', end: '2024-03-01' })
})
test('les autres périodes du tableau de bord conservent leur durée', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  for (const [period, days] of [['7d', 7], ['30d', 30], ['90d', 90]] as const) {
    const bounds = classroomPeriodBounds(period, now)
    assert.equal((Date.parse(bounds.end) - Date.parse(bounds.start)) / 86400000 + 1, days)
  }
  assert.equal(now.toISOString(), '2026-01-01T00:00:00.000Z')
})
