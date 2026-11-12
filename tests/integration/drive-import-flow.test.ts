import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyDriveChange,
  DriveToolError,
  proposeDriveChange,
  readDriveFile,
  searchDriveFiles,
  type DriveToolDependencies,
} from '../../src/features/integrations/drive/server/driveTools.ts'
import { createDriveAgentTools, MAX_DRIVE_READS_PER_REQUEST } from '../../src/features/agent/server/driveAgentTools.ts'
import { GoogleAccessTokenError } from '../../src/features/integrations/google/server/googleAccessToken.ts'
import { DRIVE_GOOGLE_DOC_MIME, DRIVE_PDF_MIME } from '../../src/features/integrations/drive/schemas/driveImportSchema.ts'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const DOC_ID = 'abcdefghij_KLM'

interface Calls {
  listFiles: unknown[]
  replaceDocText: Array<{ fileId: string; text: string }>
  createDoc: Array<{ name: string; text: string }>
}

function makeDeps(overrides: Partial<DriveToolDependencies> = {}): { deps: DriveToolDependencies; calls: Calls } {
  const calls: Calls = { listFiles: [], replaceDocText: [], createDoc: [] }
  const deps: DriveToolDependencies = {
    getAccessToken: async () => 'token-test',
    listFiles: async (input) => {
      calls.listFiles.push(input)
      return [{ id: DOC_ID, name: 'Gabarit lettre', mimeType: DRIVE_GOOGLE_DOC_MIME, modifiedTime: null, webViewLink: null }]
    },
    getMetadata: async ({ fileId }) => ({
      id: fileId,
      name: 'Gabarit lettre',
      mimeType: DRIVE_GOOGLE_DOC_MIME,
      size: null,
      webViewLink: `https://docs.google.com/document/d/${fileId}`,
    }),
    downloadBytes: async () => new Uint8Array(),
    exportText: async () => 'Bonjour {{prénom}}, merci de votre confiance.',
    createDoc: async ({ name, text }) => {
      calls.createDoc.push({ name, text })
      return { id: 'new-doc-id-000', name, webViewLink: 'https://docs.google.com/document/d/new-doc-id-000' }
    },
    replaceDocText: async ({ fileId, text }) => {
      calls.replaceDocText.push({ fileId, text })
    },
    ...overrides,
  }
  return { deps, calls }
}

test('recherche : fichiers listés avec le filtre de nom et la taille par défaut', async () => {
  const { deps, calls } = makeDeps()
  const result = await searchDriveFiles(USER_ID, { query: '  gabarit ' }, deps)
  assert.equal(result.files[0]?.name, 'Gabarit lettre')
  assert.deepEqual(calls.listFiles[0], { accessToken: 'token-test', nameContains: 'gabarit', pageSize: 10 })
})

test('lecture : un Google Doc est exporté en texte et placé dans le bloc de données délimité', async () => {
  const { deps } = makeDeps()
  const result = await readDriveFile(USER_ID, { fileId: DOC_ID }, deps)
  assert.equal(result.name, 'Gabarit lettre')
  assert.equal(result.truncated, false)
  assert.match(result.reference, /<document_drive>/)
  assert.match(result.reference, /Bonjour \{\{prénom\}\}/)
})

test('lecture : type de fichier non pris en charge refusé avant tout téléchargement', async () => {
  const { deps } = makeDeps({
    getMetadata: async ({ fileId }) => ({ id: fileId, name: 'Image', mimeType: 'image/png', size: 10, webViewLink: null }),
  })
  await assert.rejects(readDriveFile(USER_ID, { fileId: DOC_ID }, deps), (error: unknown) => {
    assert.ok(error instanceof DriveToolError)
    assert.equal(error.code, 'FILE_UNSUPPORTED')
    return true
  })
})

test('proposition : ne modifie RIEN, renvoie la modification à confirmer', async () => {
  const { deps, calls } = makeDeps()
  const result = await proposeDriveChange(
    USER_ID,
    { change: { type: 'update_doc', fileId: DOC_ID, text: 'Texte corrigé' } },
    deps
  )
  assert.equal(result.status, 'proposal')
  assert.equal(result.targetName, 'Gabarit lettre')
  assert.equal(calls.replaceDocText.length, 0)
  assert.equal(calls.createDoc.length, 0)
})

test('proposition : mise à jour refusée si la cible n’est pas un Google Doc (PDF)', async () => {
  const { deps, calls } = makeDeps({
    getMetadata: async ({ fileId }) => ({ id: fileId, name: 'Scan.pdf', mimeType: DRIVE_PDF_MIME, size: 10, webViewLink: null }),
  })
  await assert.rejects(
    proposeDriveChange(USER_ID, { change: { type: 'update_doc', fileId: DOC_ID, text: 'x' } }, deps),
    (error: unknown) => error instanceof DriveToolError && error.code === 'CHANGE_UNSUPPORTED'
  )
  assert.equal(calls.replaceDocText.length, 0)
})

test('application après confirmation : texte remplacé dans le Google Doc', async () => {
  const { deps, calls } = makeDeps()
  const result = await applyDriveChange(
    USER_ID,
    { change: { type: 'update_doc', fileId: DOC_ID, text: 'Texte confirmé' } },
    deps
  )
  assert.equal(result.status, 'done')
  assert.deepEqual(calls.replaceDocText, [{ fileId: DOC_ID, text: 'Texte confirmé' }])
})

test('application après confirmation : création d’un nouveau Google Doc', async () => {
  const { deps, calls } = makeDeps()
  const result = await applyDriveChange(
    USER_ID,
    { change: { type: 'create_doc', name: 'Lettre parents', text: 'Bonjour' } },
    deps
  )
  assert.equal(result.status, 'done')
  assert.deepEqual(calls.createDoc, [{ name: 'Lettre parents', text: 'Bonjour' }])
})

test('Drive non connecté ou scope absent : codes métier, sans message brut', async () => {
  const notConnected = makeDeps({
    getAccessToken: async () => {
      throw new GoogleAccessTokenError('GOOGLE_NOT_CONNECTED')
    },
  })
  await assert.rejects(searchDriveFiles(USER_ID, {}, notConnected.deps), (error: unknown) => {
    assert.ok(error instanceof DriveToolError)
    assert.equal(error.code, 'DRIVE_NOT_CONNECTED')
    return true
  })

  const scopeMissing = makeDeps({
    getAccessToken: async () => {
      throw new GoogleAccessTokenError('GOOGLE_SCOPE_MISSING')
    },
  })
  await assert.rejects(searchDriveFiles(USER_ID, {}, scopeMissing.deps), (error: unknown) => {
    assert.ok(error instanceof DriveToolError)
    assert.equal(error.code, 'DRIVE_SCOPE_MISSING')
    return true
  })
})

test('erreur Google inattendue : code DRIVE_FAILED, jamais le message brut', async () => {
  const { deps } = makeDeps({
    listFiles: async () => {
      throw new Error('quota interne xyz-secret')
    },
  })
  await assert.rejects(searchDriveFiles(USER_ID, {}, deps), (error: unknown) => {
    assert.ok(error instanceof DriveToolError)
    assert.equal(error.code, 'DRIVE_FAILED')
    assert.equal(error.message.includes('xyz-secret'), false)
    return true
  })
})

test('outils agent : recherche renvoie ok, proposition renvoie proposal sans écriture', async () => {
  const { deps, calls } = makeDeps()
  const tools = createDriveAgentTools(USER_ID, deps) as unknown as Record<
    string,
    { execute: (input: unknown, options: unknown) => Promise<Record<string, unknown>> }
  >
  const options = { toolCallId: 'test', messages: [] }

  const search = await tools.drive_search!.execute({ query: 'gabarit' }, options)
  assert.equal(search.status, 'ok')

  const proposal = await tools.drive_propose_change!.execute(
    { change: { type: 'update_doc', fileId: DOC_ID, text: 'Proposé' } },
    options
  )
  assert.equal(proposal.status, 'proposal')
  assert.equal(calls.replaceDocText.length, 0)
})

test('outils agent : Drive absent renvoie needs_connection feature drive', async () => {
  const { deps } = makeDeps({
    getAccessToken: async () => {
      throw new GoogleAccessTokenError('GOOGLE_NOT_CONNECTED')
    },
  })
  const tools = createDriveAgentTools(USER_ID, deps) as unknown as Record<
    string,
    { execute: (input: unknown, options: unknown) => Promise<Record<string, unknown>> }
  >
  const result = await tools.drive_search!.execute({}, { toolCallId: 'test', messages: [] })
  assert.deepEqual(result, { status: 'needs_connection', feature: 'drive' })
})

test('document plus long que la limite de lecture : modification refusée, rien écrit', async () => {
  const { deps, calls } = makeDeps({ exportText: async () => 'a'.repeat(40_001) })
  await assert.rejects(
    proposeDriveChange(USER_ID, { change: { type: 'update_doc', fileId: DOC_ID, text: 'Remplacement' } }, deps),
    (error: unknown) => error instanceof DriveToolError && error.code === 'CHANGE_UNSUPPORTED'
  )
  await assert.rejects(
    applyDriveChange(USER_ID, { change: { type: 'update_doc', fileId: DOC_ID, text: 'Remplacement' } }, deps),
    (error: unknown) => error instanceof DriveToolError && error.code === 'CHANGE_UNSUPPORTED'
  )
  assert.equal(calls.replaceDocText.length, 0)
})

test('budget de lecture : au-delà de la limite par requête, aucune lecture supplémentaire', async () => {
  const { deps } = makeDeps()
  const tools = createDriveAgentTools(USER_ID, deps) as unknown as Record<
    string,
    { execute: (input: unknown, options: unknown) => Promise<Record<string, unknown>> }
  >
  const options = { toolCallId: 'test', messages: [] }
  const outcomes: string[] = []
  for (let index = 0; index < MAX_DRIVE_READS_PER_REQUEST + 1; index += 1) {
    const result = await tools.drive_read!.execute({ fileId: DOC_ID }, options)
    outcomes.push(String(result.status === 'ok' ? 'ok' : result.reason))
  }
  assert.equal(outcomes.at(-1), 'READ_LIMIT_REACHED')
  assert.equal(outcomes.slice(0, -1).every((status) => status === 'ok'), true)
})
