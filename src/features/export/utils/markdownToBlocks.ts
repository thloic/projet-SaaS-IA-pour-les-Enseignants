import type { ExportBlock } from '@/features/export/types/export.types'

// Portage non-React du decoupage markdown utilise par
// src/features/generation/components/MarkdownContent.tsx, pour que le PDF/DOCX
// exporte exactement le meme contenu que ce que l'enseignant voit a l'ecran.
export function parseMarkdownToBlocks(content: string): ExportBlock[] {
  const blocks: ExportBlock[] = []
  let listItems: string[] = []

  function flushList() {
    if (listItems.length === 0) return
    blocks.push({ type: 'bullets', items: listItems })
    listItems = []
  }

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      continue
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2))
      continue
    }

    flushList()

    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading1', text: trimmed.slice(2) })
      continue
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading2', text: trimmed.slice(3) })
      continue
    }

    blocks.push({ type: 'paragraph', text: trimmed })
  }

  flushList()

  return blocks
}
