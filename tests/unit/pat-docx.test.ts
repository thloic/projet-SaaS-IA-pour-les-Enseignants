import assert from 'node:assert/strict'
import test from 'node:test'

import { patMock } from '../../src/features/agent/mocks/patMock.ts'
import type { PAT } from '../../src/features/agent/schemas/patSchema.ts'
import { exportPATToDocx } from '../../src/features/agent/utils/exportPATDocx.ts'

function assertDocx(buffer: Buffer): void {
  assert.ok(buffer.length > 0)
  assert.equal(buffer.subarray(0, 2).toString('ascii'), 'PK')
}

test('exportPATToDocx génère un fichier DOCX valide à partir du mock PAT', async () => {
  const docx = await exportPATToDocx(patMock)

  assertDocx(docx)
})

test('exportPATToDocx accepte un PAT sans champs optionnels', async () => {
  const patWithoutOptionalFields: PAT = {
    eleve: { nom: patMock.eleve.nom },
    habiletes: patMock.habiletes,
    comportementsCibles: patMock.comportementsCibles.map(
      ({ habilete, interventionsPrevues }) => ({ habilete, interventionsPrevues })
    ),
    modalitesAppui: patMock.modalitesAppui,
    adaptationsOffertes: patMock.adaptationsOffertes,
  }

  assertDocx(await exportPATToDocx(patWithoutOptionalFields))
})

test('exportPATToDocx accepte des listes et un tableau de comportements longs', async () => {
  const longPAT: PAT = {
    ...patMock,
    comportementsCibles: Array.from({ length: 12 }, (_, index) => ({
      habilete: `${index + 1}. ${patMock.comportementsCibles[0].habilete}`,
      interventionsPrevues: patMock.comportementsCibles[0].interventionsPrevues,
      preuvesProgression: patMock.comportementsCibles[0].preuvesProgression,
    })),
    adaptationsOffertes: Array.from(
      { length: 16 },
      (_, index) => `${index + 1}. ${patMock.adaptationsOffertes[index % patMock.adaptationsOffertes.length]}`
    ),
  }

  assertDocx(await exportPATToDocx(longPAT))
})
