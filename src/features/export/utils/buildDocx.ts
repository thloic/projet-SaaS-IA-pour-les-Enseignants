import 'server-only'

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import type { ExportBlock, ExportDocument } from '@/features/export/types/export.types'

const BASE_SIZE = 22 // demi-points, ~11pt
const DYS_SIZE = 28 // ~14pt
const BASE_LINE = 276 // ~1.15
const DYS_LINE = 480 // ~2.0
const BASE_SPACING = 160
const DYS_SPACING = 240

function buildParagraphs(blocks: ExportBlock[], dysLayout: boolean): Paragraph[] {
  const size = dysLayout ? DYS_SIZE : BASE_SIZE
  const line = dysLayout ? DYS_LINE : BASE_LINE
  const spacing = dysLayout ? DYS_SPACING : BASE_SPACING

  const paragraphs: Paragraph[] = []

  for (const block of blocks) {
    if (block.type === 'heading1') {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: spacing, after: spacing },
          children: [new TextRun({ text: block.text, size: size + 6, bold: true })],
        })
      )
      continue
    }

    if (block.type === 'heading2') {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: spacing, after: spacing },
          children: [new TextRun({ text: block.text, size: size + 2, bold: true })],
        })
      )
      continue
    }

    if (block.type === 'paragraph') {
      paragraphs.push(
        new Paragraph({
          spacing: { after: spacing, line },
          children: [new TextRun({ text: block.text, size })],
        })
      )
      continue
    }

    for (const item of block.items) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: Math.round(spacing / 2), line },
          children: [new TextRun({ text: item, size })],
        })
      )
    }
  }

  return paragraphs
}

export async function buildDocx(document: ExportDocument): Promise<Buffer> {
  const size = document.dysLayout ? DYS_SIZE : BASE_SIZE

  const titleParagraph = new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 120 },
    children: [new TextRun({ text: document.title, bold: true, size: size + 12 })],
  })

  const metaParagraph =
    document.meta.length > 0
      ? new Paragraph({
          spacing: { after: 280 },
          children: [new TextRun({ text: document.meta.join('  ·  '), size, color: '555555' })],
        })
      : null

  const doc = new Document({
    sections: [
      {
        children: [
          titleParagraph,
          ...(metaParagraph ? [metaParagraph] : []),
          ...buildParagraphs(document.blocks, document.dysLayout),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}
