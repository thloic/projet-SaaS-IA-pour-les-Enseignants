'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, Crown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import GenerationCounter from '@/components/shared/GenerationCounter'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'
import { useBilling } from '@/features/billing/hooks/useBilling'
import type { SubscriptionSummary } from '@/features/billing/server/subscriptionCore'

const BRAND = '#534AB7'

interface SubscriptionSectionProps {
  subscription: SubscriptionSummary
  generationsUsed: number
  generationsLimit: number
}

export default function SubscriptionSection({
  subscription,
  generationsUsed,
  generationsLimit,
}: SubscriptionSectionProps) {
  const { t, locale } = useAppLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { startCheckout, openPortal, pendingAction, error } = useBilling()
  const checkoutStatus = searchParams.get('checkout')
  const [activating, setActivating] = useState(checkoutStatus === 'success')

  useEffect(() => {
    if (checkoutStatus !== 'success') return
    // Le webhook Stripe peut ne pas avoir encore traité l'événement au retour
    // de la redirection — on laisse un court délai puis on rafraîchit une
    // seule fois plutôt que d'afficher "Pro" en se fiant à la seule redirection.
    const timeout = setTimeout(() => {
      setActivating(false)
      router.refresh()
    }, 2500)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard size={16} style={{ color: BRAND }} />
        <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND }}>
          {t.settings.planBilling}
        </h2>
      </div>
      <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold flex items-center gap-2">
              {subscription.plan === 'pro' ? t.settings.proPlan : t.common.freePlan}
              <Badge className="bg-muted text-muted-foreground border-border text-[10px]">{t.settings.current}</Badge>
            </p>
            {subscription.plan === 'free' && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {generationsUsed} / {generationsLimit} {t.settings.usedThisMonth}
              </p>
            )}
            {subscription.plan === 'pro' && subscription.currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {t.settings.nextRenewalPrefix}
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
        </div>

        {activating && (
          <p className="text-sm font-medium" style={{ color: BRAND }}>
            {t.settings.activating}
          </p>
        )}

        {subscription.plan === 'pro' && subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-500">
            {t.settings.cancelBannerPrefix}
            {formatDate(subscription.currentPeriodEnd)}
          </div>
        )}

        {subscription.plan === 'free' && (
          <GenerationCounter used={generationsUsed} limit={generationsLimit} label={t.settings.usedThisMonth} />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Separator />

        {subscription.plan === 'pro' ? (
          <Button
            onClick={() => openPortal()}
            disabled={pendingAction !== null}
            className="w-full text-white font-bold h-10"
            style={{ backgroundColor: BRAND }}
          >
            <CreditCard size={15} className="mr-2" /> {t.settings.manageSubscription}
          </Button>
        ) : (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-amber-400" />
              <p className="font-bold">{t.settings.upgradeTitle}</p>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {t.settings.planFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check size={12} className="text-emerald-400 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => startCheckout('month')}
                disabled={pendingAction !== null}
                className="flex-1 text-white font-bold h-10"
                style={{ backgroundColor: BRAND }}
              >
                <Crown size={15} className="mr-2" /> {t.settings.upgradeCtaMonthly}
              </Button>
              <Button
                onClick={() => startCheckout('year')}
                disabled={pendingAction !== null}
                variant="outline"
                className="flex-1 font-bold h-10"
              >
                {t.settings.upgradeCtaAnnual}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
