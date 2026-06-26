'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const normalized: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options

    return new Promise<boolean>((resolve) => {
      setPending({ ...normalized, resolve })
    })
  }, [])

  function close(result: boolean) {
    pending?.resolve(result)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold">{pending.title ?? 'Confirmer la suppression'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{pending.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(false)}>
                {pending.cancelLabel ?? 'Annuler'}
              </Button>
              <Button
                className="bg-rose-500 text-white hover:bg-rose-600"
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? 'Supprimer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm doit être utilisé à l’intérieur d’un ConfirmProvider')
  }
  return ctx.confirm
}
