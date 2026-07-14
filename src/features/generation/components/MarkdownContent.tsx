import type { ReactNode } from 'react'

interface MarkdownContentProps {
  content: string
}

function inlineCodeParts(value: string) {
  const parts = value.split(/(`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-muted px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={index}>{part}</span>
  })
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  const lines = content.split('\n')
  const elements: ReactNode[] = []
  let listItems: string[] = []

  function flushList() {
    if (listItems.length === 0) return
    const items = listItems
    listItems = []
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-3 list-disc space-y-1 pl-5">
        {items.map((item, index) => (
          <li key={index}>{inlineCodeParts(item)}</li>
        ))}
      </ul>
    )
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      return
    }

    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2))
      return
    }

    flushList()

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={index} className="mb-4 text-2xl font-black">
          {trimmed.slice(2)}
        </h1>
      )
      return
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={index} className="mt-6 mb-2 text-lg font-bold">
          {trimmed.slice(3)}
        </h2>
      )
      return
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      elements.push(
        <p key={index} className="my-2 leading-relaxed">
          {inlineCodeParts(trimmed)}
        </p>
      )
      return
    }

    elements.push(
      <p key={index} className="my-2 leading-relaxed">
        {inlineCodeParts(trimmed)}
      </p>
    )
  })

  flushList()

  return <div className="text-sm leading-relaxed">{elements}</div>
}
