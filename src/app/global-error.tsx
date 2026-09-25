'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="fr">
      <body className="min-h-full flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">
          Une erreur inattendue est survenue. Rechargez la page ou réessayez plus tard.
        </p>
      </body>
    </html>
  )
}
