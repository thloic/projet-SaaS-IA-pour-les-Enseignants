import 'server-only'

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { ExportBlock, ExportDocument } from '@/features/export/types/export.types'

const baseStyles = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 40, fontSize: 11, lineHeight: 1.4 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  meta: { fontSize: 10, color: '#555555', marginBottom: 18 },
  heading1: { fontSize: 16, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  heading2: { fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 6 },
  paragraph: { marginBottom: 8 },
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bulletMark: { width: 12 },
  bulletText: { flex: 1 },
})

// Mise en page DYS : police plus grande, interlignage et espacements augmentes.
const dysStyles = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 40, fontSize: 14, lineHeight: 1.8 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  meta: { fontSize: 12, color: '#555555', marginBottom: 22 },
  heading1: { fontSize: 18, fontWeight: 700, marginTop: 20, marginBottom: 10 },
  heading2: { fontSize: 15, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  paragraph: { marginBottom: 12 },
  bulletRow: { flexDirection: 'row', marginBottom: 6 },
  bulletMark: { width: 16 },
  bulletText: { flex: 1 },
})

type Styles = typeof baseStyles

function renderBlock(block: ExportBlock, styles: Styles, key: number) {
  switch (block.type) {
    case 'heading1':
      return (
        <Text key={key} style={styles.heading1}>
          {block.text}
        </Text>
      )
    case 'heading2':
      return (
        <Text key={key} style={styles.heading2}>
          {block.text}
        </Text>
      )
    case 'paragraph':
      return (
        <Text key={key} style={styles.paragraph}>
          {block.text}
        </Text>
      )
    case 'bullets':
      return (
        <View key={key}>
          {block.items.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.bulletRow}>
              <Text style={styles.bulletMark}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      )
    default:
      return null
  }
}

export async function buildPdf(document: ExportDocument): Promise<Buffer> {
  const styles = document.dysLayout ? dysStyles : baseStyles

  return renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{document.title}</Text>
        {document.meta.length > 0 && <Text style={styles.meta}>{document.meta.join('  ·  ')}</Text>}
        {document.blocks.map((block, index) => renderBlock(block, styles, index))}
      </Page>
    </Document>
  )
}
