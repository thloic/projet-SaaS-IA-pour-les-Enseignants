import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

interface QuizButtonProps {
  sourceDocumentId: string
}

export default function QuizButton({ sourceDocumentId }: QuizButtonProps) {
  return (
    <Link
      href={`/quiz?sourceDocumentId=${sourceDocumentId}`}
      className="flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:w-fit sm:justify-start"
    >
      <ClipboardList size={14} /> Créer un quiz
    </Link>
  )
}
