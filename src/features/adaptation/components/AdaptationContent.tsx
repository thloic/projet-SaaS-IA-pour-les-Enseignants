import type { ReactNode } from 'react'
import type { VariantType } from '@/features/adaptation/schemas/adaptationSchema'
import { cn } from '@/lib/utils'

interface AdaptationContentProps {
  content: string
  variantType: VariantType
}

export default function AdaptationContent({
  content,
  variantType,
}: AdaptationContentProps) {
  const elements: ReactNode[] = []
  let bullets: string[] = []

  function flushBullets() {
    if (bullets.length === 0) return
    const current = bullets
    bullets = []
    elements.push(
      <ul key={`list-${elements.length}`} className="my-3 list-disc space-y-2 pl-5">
        {current.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    )
  }

  content.split('\n').forEach((line, index) => {
    const value = line.trim()
    if (!value) {
      flushBullets()
      return
    }
    if (value.startsWith('- ')) {
      bullets.push(value.slice(2))
      return
    }

    flushBullets()
    if (value.startsWith('# ')) {
      elements.push(
        <h1 key={index} className="mb-5 break-words text-2xl font-black sm:text-3xl">
          {value.slice(2)}
        </h1>
      )
    } else if (value.startsWith('## ')) {
      elements.push(
        <h2 key={index} className="mb-2 mt-7 break-words text-lg font-bold sm:text-xl">
          {value.slice(3)}
        </h2>
      )
    } else {
      elements.push(<p key={index} className="my-2">{value}</p>)
    }
  })
  flushBullets()

  return (
    <div
      className={cn(
        'max-w-none break-words text-sm leading-7 sm:text-base',
        variantType === 'dys' && 'text-base leading-8 tracking-normal sm:text-lg'
      )}
    >
      {elements}
    </div>
  )
}
