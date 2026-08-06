import assert from 'node:assert/strict'
import test from 'node:test'

import { studentSchema } from '../../src/features/classroom/schemas/classroomSchema.ts'
import {
  institutionalAdaptationsToText,
  normalizeInstitutionalAdaptations,
} from '../../src/features/classroom/utils/institutionalAdaptations.ts'

test('normalise la saisie des adaptations institutionnelles d’un élève fictif', () => {
  const parsed = studentSchema.parse({
    firstName: 'Naya',
    lastName: 'Dorel',
    sex: 'F',
    familyLanguage: 'fr',
    institutionalAdaptations:
      'Temps supplémentaire\nReformulation des consignes, temps supplémentaire',
    interventionPlan: false,
  })

  assert.deepEqual(normalizeInstitutionalAdaptations(parsed.institutionalAdaptations ?? ''), [
    'Temps supplémentaire',
    'Reformulation des consignes',
  ])
})

test('restitue les adaptations enregistrées dans le champ du dossier élève', () => {
  const stored = ['Temps supplémentaire', 'Technologie d’assistance']
  const displayed = institutionalAdaptationsToText(stored)

  assert.equal(displayed, 'Temps supplémentaire\nTechnologie d’assistance')
  assert.deepEqual(normalizeInstitutionalAdaptations(displayed), stored)
})

test('une saisie vide produit une liste vide', () => {
  assert.deepEqual(normalizeInstitutionalAdaptations('  \n,  '), [])
})
