import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClassContextRepository } from '../../src/features/agent/server/classContextRepository.ts'
import { calculateClassAverages } from '../../src/features/agent/server/classContextCore.ts'

function database(options: { owned?: boolean; failPage?: number; failOwnership?: boolean } = {}) {
  const calls: Array<{ table: string; filters: Record<string, string>; range?: number[] }> = []
  const rows = Array.from({ length: 1001 }, (_, i) => ({ student_id: String(i), title: 'Lecture', grade: i < 1000 ? '10/20' : '20/20' }))
  const client = {
    from(table: string) {
      const call: (typeof calls)[number] = { table, filters: {} }
      calls.push(call)
      const query = {
        select() { return query },
        eq(key: string, value: string) { call.filters[key] = value; return query },
        order() { return query },
        async maybeSingle() { return { data: options.owned === false ? null : { id: 'class' }, error: options.failOwnership ? new Error('denied') : null } },
        async range(start: number, end: number) {
          call.range = [start, end]
          return { data: rows.slice(start, end + 1), error: start === options.failPage ? new Error('failed') : null }
        },
        then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: [], error: null }).then(resolve) },
      }
      return query
    },
  } as unknown as SupabaseClient
  return { client, calls }
}

test('lecture des trois pages : agrégation complète avec filtre propriétaire et classe sur chaque requête', async () => {
  const db = database()
  const repository = createClassContextRepository(db.client)
  const rows = await repository.listEvaluationGrades('teacher', 'class')
  assert.equal(rows.length, 1001)
  assert.deepEqual(db.calls[0], { table: 'classes', filters: { user_id: 'teacher', id: 'class' } })
  for (const call of db.calls.slice(1)) assert.deepEqual(call.filters, { user_id: 'teacher', class_id: 'class' })
  assert.deepEqual(db.calls.slice(1).map((call) => call.range), [[0, 499], [500, 999], [1000, 1499]])
  assert.equal(calculateClassAverages(rows, '20')[0].average, 10.01)
})
test('classe non autorisée : aucune requête de résultats', async () => {
  const db = database({ owned: false })
  await assert.rejects(createClassContextRepository(db.client).listEvaluationGrades('teacher', 'foreign'), /CLASS_NOT_FOUND/)
  assert.equal(db.calls.length, 1)
})
test('erreurs de permissions et de pagination : jamais de résultats partiels', async () => {
  const denied = database({ failOwnership: true })
  await assert.rejects(createClassContextRepository(denied.client).listEvaluationGrades('teacher', 'class'), /CLASS_LOOKUP_FAILED/)
  assert.equal(denied.calls.length, 1)
  const failed = database({ failPage: 500 })
  await assert.rejects(createClassContextRepository(failed.client).listEvaluationGrades('teacher', 'class'), /CLASS_EVALUATIONS_FAILED/)
})
test('authentification requise et liste des classes limitée au propriétaire', async () => {
  const db = database()
  const repository = createClassContextRepository(db.client)
  await assert.rejects(repository.listOwnedClasses(''), /AUTH_REQUIRED/)
  await assert.rejects(repository.listEvaluationGrades('', 'class'), /AUTH_REQUIRED/)
  assert.equal(db.calls.length, 0)
  await repository.listOwnedClasses('teacher')
  assert.deepEqual(db.calls[0].filters, { user_id: 'teacher' })
})
