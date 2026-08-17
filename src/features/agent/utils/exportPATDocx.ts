import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

import type { PAT } from '../schemas/patSchema.ts'
import type { ContentLanguage } from '@/features/i18n/locale'
import { patTranslations, type PATTranslations } from '../i18n/patTranslations.ts'

const BODY_SIZE = 21
const SMALL_SIZE = 19
const PRIMARY_COLOR = '244A64'
const SECONDARY_COLOR = 'EAF1F5'
const BORDER_COLOR = 'AAB8C2'
const TABLE_WIDTH = 10_440

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  left: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  right: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
}

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function toColumnWidth(percent: number): number {
  return Math.round((TABLE_WIDTH * percent) / 100)
}

function textParagraph(text: string, bold = false): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 276 },
    children: [new TextRun({ text, bold, size: BODY_SIZE, font: 'Arial' })],
  })
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60, line: 276 },
    children: [new TextRun({ text, size: BODY_SIZE, font: 'Arial' })],
  })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    spacing: { before: 260, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: PRIMARY_COLOR,
        size: 26,
        font: 'Arial',
      }),
    ],
  })
}

function tableCell(
  children: Paragraph[],
  options: { header?: boolean; widthPercent?: number } = {}
): TableCell {
  return new TableCell({
    children: children.length > 0 ? children : [textParagraph('')],
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    shading: options.header
      ? { fill: PRIMARY_COLOR, type: ShadingType.CLEAR, color: 'auto' }
      : undefined,
    width:
      options.widthPercent === undefined
        ? undefined
        : {
            size: toColumnWidth(options.widthPercent),
            type: WidthType.DXA,
          },
  })
}

function headerCell(text: string, widthPercent?: number): TableCell {
  return tableCell(
    [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text, bold: true, color: 'FFFFFF', size: SMALL_SIZE, font: 'Arial' }),
        ],
      }),
    ],
    { header: true, widthPercent }
  )
}

function infoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [textParagraph(label, true)],
        shading: { fill: SECONDARY_COLOR, type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        width: { size: toColumnWidth(28), type: WidthType.DXA },
      }),
      tableCell([textParagraph(value)], { widthPercent: 72 }),
    ],
  })
}

function bulletTable(title: string, items: string[]): Table {
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [TABLE_WIDTH],
    layout: TableLayoutType.FIXED,
    borders: tableBorders,
    rows: [
      new TableRow({ tableHeader: true, children: [headerCell(title, 100)] }),
      new TableRow({
        children: [tableCell(items.map(bulletParagraph), { widthPercent: 100 })],
      }),
    ],
  })
}

function buildStudentHeader(pat: PAT, labels: PATTranslations): Table {
  const rows = [infoRow(labels.student, pat.eleve.nom)]

  if (hasText(pat.eleve.niveau)) {
    rows.push(infoRow(labels.level, pat.eleve.niveau))
  }
  if (hasText(pat.eleve.profil)) {
    rows.push(infoRow(labels.profile, pat.eleve.profil))
  }

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [toColumnWidth(28), toColumnWidth(72)],
    layout: TableLayoutType.FIXED,
    borders: tableBorders,
    rows,
  })
}

function buildSkillsTable(pat: PAT, labels: PATTranslations): Table {
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [toColumnWidth(50), toColumnWidth(50)],
    layout: TableLayoutType.FIXED,
    borders: tableBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [headerCell(labels.strengths, 50), headerCell(labels.needs, 50)],
      }),
      new TableRow({
        children: [
          tableCell(pat.habiletes.forces.map(bulletParagraph), { widthPercent: 50 }),
          tableCell(pat.habiletes.besoins.map(bulletParagraph), { widthPercent: 50 }),
        ],
      }),
    ],
  })
}

function buildTargetsTable(pat: PAT, labels: PATTranslations): Table {
  const showDate = pat.comportementsCibles.some(({ date }) => hasText(date))
  const showEvidence = pat.comportementsCibles.some(({ preuvesProgression }) =>
    hasText(preuvesProgression)
  )
  const mainWidth = showDate ? (showEvidence ? 28 : 42) : showEvidence ? 36 : 50

  const headerCells: TableCell[] = []
  if (showDate) {
    headerCells.push(headerCell(labels.date, 16))
  }
  headerCells.push(headerCell(labels.skill, mainWidth))
  headerCells.push(headerCell(labels.interventions, mainWidth))
  if (showEvidence) {
    headerCells.push(headerCell(labels.evidence, 28))
  }

  const columnWidths = [
    ...(showDate ? [toColumnWidth(16)] : []),
    toColumnWidth(mainWidth),
    toColumnWidth(mainWidth),
    ...(showEvidence ? [toColumnWidth(28)] : []),
  ]

  const rows = pat.comportementsCibles.map((target) => {
    const cells: TableCell[] = []
    if (showDate) {
      cells.push(tableCell([textParagraph(target.date ?? '')], { widthPercent: 16 }))
    }
    cells.push(tableCell([textParagraph(target.habilete)], { widthPercent: mainWidth }))
    cells.push(
      tableCell([textParagraph(target.interventionsPrevues)], { widthPercent: mainWidth })
    )
    if (showEvidence) {
      cells.push(
        tableCell([textParagraph(target.preuvesProgression ?? '')], {
          widthPercent: 28,
        })
      )
    }
    return new TableRow({ children: cells, cantSplit: true })
  })

  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    borders: tableBorders,
    rows: [new TableRow({ tableHeader: true, children: headerCells }), ...rows],
  })
}

function buildFrancisation(pat: PAT, labels: PATTranslations): Array<Paragraph | Table> {
  const francisation = pat.francisation
  if (!francisation) {
    return []
  }

  const rows: TableRow[] = []
  if (hasText(francisation.communicationOrale)) {
    rows.push(infoRow(labels.oral, francisation.communicationOrale))
  }
  if (hasText(francisation.lecture)) {
    rows.push(infoRow(labels.reading, francisation.lecture))
  }
  if (hasText(francisation.ecriture)) {
    rows.push(infoRow(labels.writing, francisation.ecriture))
  }

  const needs = francisation.besoins?.filter(hasText) ?? []
  if (needs.length > 0) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [textParagraph(labels.needs, true)],
            shading: { fill: SECONDARY_COLOR, type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            width: { size: toColumnWidth(28), type: WidthType.DXA },
          }),
          tableCell(needs.map(bulletParagraph), { widthPercent: 72 }),
        ],
      })
    )
  }

  if (rows.length === 0) {
    return []
  }

  return [
    sectionHeading(labels.francisation),
    new Table({
      width: { size: TABLE_WIDTH, type: WidthType.DXA },
      columnWidths: [toColumnWidth(28), toColumnWidth(72)],
      layout: TableLayoutType.FIXED,
      borders: tableBorders,
      rows,
    }),
  ]
}

export async function exportPATToDocx(
  pat: PAT,
  options: { language?: ContentLanguage } = {}
): Promise<Buffer> {
  const language = options.language ?? 'fr'
  const labels = patTranslations[language]
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: labels.title,
          bold: true,
          color: PRIMARY_COLOR,
          size: 34,
          font: 'Arial',
        }),
      ],
    }),
    buildStudentHeader(pat, labels),
    sectionHeading(labels.strengthsAndNeeds),
    buildSkillsTable(pat, labels),
  ]

  if (pat.comportementsCibles.length > 0) {
    children.push(sectionHeading(labels.targets), buildTargetsTable(pat, labels))
  }
  if (pat.modalitesAppui.length > 0) {
    children.push(sectionHeading(labels.support), bulletTable(labels.supportShort, pat.modalitesAppui))
  }
  if (pat.adaptationsOffertes.length > 0) {
    children.push(
      sectionHeading(labels.adaptations),
      bulletTable(labels.adaptationsShort, pat.adaptationsOffertes)
    )
  }
  if (hasText(pat.recommandationsPSAC)) {
    children.push(sectionHeading(labels.recommendations), textParagraph(pat.recommandationsPSAC))
  }
  children.push(...buildFrancisation(pat, labels))

  const document = new Document({
    creator: 'EducAssist',
    title: `${labels.shortTitle} — ${pat.eleve.nom}`,
    description: labels.description,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(document)
}
