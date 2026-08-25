import {
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { ExportBlock, ExportDocument } from '../types/export.types.ts'

const BASE_SIZE = 22
const DYS_SIZE = 28
const BASE_LINE = 276
const DYS_LINE = 480
const BASE_SPACING = 160
const DYS_SPACING = 240

function buildContent(
  blocks: ExportBlock[],
  dysLayout: boolean,
  orientation: ExportDocument['orientation']
): Array<Paragraph | Table> {
  const size = dysLayout ? DYS_SIZE : BASE_SIZE
  const line = dysLayout ? DYS_LINE : BASE_LINE
  const spacing = dysLayout ? DYS_SPACING : BASE_SPACING
  const paragraphs: Array<Paragraph | Table> = []

  for (const block of blocks) {
    if (block.type === 'heading1' || block.type === 'heading2') {
      paragraphs.push(
        new Paragraph({
          heading: block.type === 'heading1' ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          spacing: { before: spacing, after: spacing },
          children: [
            new TextRun({
              text: block.text,
              size: size + (block.type === 'heading1' ? 6 : 2),
              bold: true,
            }),
          ],
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

    if (block.type === 'bullets') {
      for (const item of block.items) {
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: Math.round(spacing / 2), line },
            children: [new TextRun({ text: item, size })],
          })
        )
      }
      continue
    }

    const columnWidths =
      block.columnWidths?.length === block.headers.length
        ? block.columnWidths
        : block.headers.map(() => 100 / block.headers.length)
    const tableWidth = orientation === 'landscape' ? 13_900 : 9_000
    const columnWidthsDxa = columnWidths.map((width) => Math.round((tableWidth * width) / 100))
    paragraphs.push(
      new Table({
        width: { size: tableWidth, type: WidthType.DXA },
        columnWidths: columnWidthsDxa,
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            tableHeader: true,
            children: block.headers.map(
              (header, index) =>
                new TableCell({
                  width: { size: columnWidthsDxa[index], type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: header, bold: true, size: size - 2 })],
                    }),
                  ],
                })
            ),
          }),
          ...block.rows.map(
            (row) =>
              new TableRow({
                children: block.headers.map(
                  (_, index) =>
                    new TableCell({
                      width: { size: columnWidthsDxa[index], type: WidthType.DXA },
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: row[index] ?? '', size: size - 2 })],
                        }),
                      ],
                    })
                ),
              })
          ),
        ],
      })
    )
    paragraphs.push(new Paragraph({ spacing: { after: spacing } }))
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
  const metaParagraph = document.meta.length
    ? new Paragraph({
        spacing: { after: 280 },
        children: [new TextRun({ text: document.meta.join('  ·  '), size, color: '555555' })],
      })
    : null
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation:
                document.orientation === 'landscape'
                  ? PageOrientation.LANDSCAPE
                  : PageOrientation.PORTRAIT,
            },
          },
        },
        children: [
          titleParagraph,
          ...(metaParagraph ? [metaParagraph] : []),
          ...buildContent(document.blocks, document.dysLayout, document.orientation),
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}
