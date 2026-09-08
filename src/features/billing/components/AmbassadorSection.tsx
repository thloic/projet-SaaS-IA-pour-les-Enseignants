'use client'

import { Copy, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/shared/ToastProvider'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import type { AmbassadorSummary } from '@/features/billing/server/ambassador'

const BRAND = '#534AB7'

interface AmbassadorSectionProps {
  ambassador: AmbassadorSummary
}

export default function AmbassadorSection({ ambassador }: AmbassadorSectionProps) {
  const { t } = useAppLocale()
  const { showToast } = useToast()

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(ambassador.code)
      showToast(t.settings.ambassadorCopied, 'success')
    } catch {
      showToast(t.settings.ambassadorCopyError, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users size={16} style={{ color: BRAND }} />
        <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND }}>
          {t.settings.ambassadorTitle}
        </h2>
      </div>
      <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
        <p className="text-sm text-muted-foreground">{t.settings.ambassadorDescription}</p>

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm font-semibold tracking-wider">
            {ambassador.code}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="h-10 shrink-0"
          >
            <Copy size={14} className="mr-2" /> {t.settings.ambassadorCopy}
          </Button>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">{t.settings.ambassadorReferrals}</p>
            <p className="font-bold text-lg">{ambassador.referralCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t.settings.ambassadorDiscount}</p>
            <p className="font-bold text-lg" style={{ color: BRAND }}>
              {ambassador.discountPercent}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
