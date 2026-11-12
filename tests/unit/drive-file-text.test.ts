import assert from 'node:assert/strict'
import test from 'node:test'
import { Document, Packer, Paragraph } from 'docx'

import {
  DriveTextError,
  extractDriveText,
  textFromExport,
  truncateDriveText,
} from '../../src/features/integrations/drive/server/driveFileText.ts'
import { DRIVE_MAX_TEXT_CHARS } from '../../src/features/integrations/drive/schemas/driveImportSchema.ts'

const encoder = new TextEncoder()

// PDF minimal valide (une page, texte Helvetica), table xref calculée.
function buildMinimalPdf(text: string): Uint8Array {
  const content = `BT /F1 24 Tf 72 72 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return encoder.encode(pdf)
}

async function buildDocxBytes(paragraphs: string[]): Promise<Uint8Array> {
  const document = new Document({
    sections: [{ children: paragraphs.map((text) => new Paragraph(text)) }],
  })
  const buffer = await Packer.toBuffer(document)
  return new Uint8Array(buffer)
}

test('TXT : décodage UTF-8 et normalisation des fins de ligne', async () => {
  const bytes = encoder.encode('Gabarit  élève\r\n\r\n\r\n\r\nConsigne 1   \n')
  const result = await extractDriveText({ mimeType: 'text/plain', bytes })
  assert.equal(result.text, 'Gabarit  élève\n\nConsigne 1')
  assert.equal(result.truncated, false)
})

test('Markdown traité comme texte brut', async () => {
  const result = await extractDriveText({
    mimeType: 'text/markdown',
    bytes: encoder.encode('# Titre\n\nTexte'),
  })
  assert.equal(result.text, '# Titre\n\nTexte')
})

test('DOCX : le texte des paragraphes est extrait', async () => {
  const bytes = await buildDocxBytes(['Lettre type pour les parents', 'Merci de votre collaboration.'])
  const result = await extractDriveText({
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bytes,
  })
  assert.match(result.text, /Lettre type pour les parents/)
  assert.match(result.text, /Merci de votre collaboration/)
})

test('PDF texte : le texte de la page est extrait', async () => {
  const result = await extractDriveText({
    mimeType: 'application/pdf',
    bytes: buildMinimalPdf('Exercice Gabarit'),
  })
  assert.match(result.text, /Exercice Gabarit/)
})

test('type MIME non pris en charge : FILE_UNSUPPORTED', async () => {
  await assert.rejects(
    () => extractDriveText({ mimeType: 'image/png', bytes: new Uint8Array([1, 2, 3]) }),
    (error: unknown) => error instanceof DriveTextError && error.code === 'FILE_UNSUPPORTED'
  )
})

test('fichier texte vide : FILE_EMPTY', async () => {
  await assert.rejects(
    () => extractDriveText({ mimeType: 'text/plain', bytes: encoder.encode('   \n\n  ') }),
    (error: unknown) => error instanceof DriveTextError && error.code === 'FILE_EMPTY'
  )
})

test('texte exporté (Google Docs) vide : FILE_EMPTY', () => {
  assert.throws(
    () => textFromExport('  \n '),
    (error: unknown) => error instanceof DriveTextError && error.code === 'FILE_EMPTY'
  )
})

test('troncature : limite exacte, indicateur truncated, jamais silencieuse', () => {
  const long = 'a'.repeat(DRIVE_MAX_TEXT_CHARS + 500)
  const result = truncateDriveText(long)
  assert.equal(result.text.length, DRIVE_MAX_TEXT_CHARS)
  assert.equal(result.truncated, true)
})

test('texte exactement à la limite : non tronqué', () => {
  const exact = 'b'.repeat(DRIVE_MAX_TEXT_CHARS)
  const result = truncateDriveText(exact)
  assert.equal(result.text.length, DRIVE_MAX_TEXT_CHARS)
  assert.equal(result.truncated, false)
})
