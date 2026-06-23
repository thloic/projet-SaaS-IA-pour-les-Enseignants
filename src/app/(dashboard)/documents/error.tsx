'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center space-y-3">
      <AlertTriangle className="mx-auto text-rose-400" size={28} />
      <p className="text-sm text-rose-300">
        {error.message || 'Impossible de charger vos documents.'}
      </p>
      <Button onClick={reset} variant="outline">
        Réessayer
      </Button>
    </div>
  )
}
