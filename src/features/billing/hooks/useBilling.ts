'use client'

import { useState } from 'react'

type BillingAction = 'checkout-month' | 'checkout-year' | 'portal' | null

export function useBilling() {
  const [pendingAction, setPendingAction] = useState<BillingAction>(null)
  const [error, setError] = useState<string | null>(null)

  async function redirectTo(url: string) {
    window.location.href = url
  }

  async function startCheckout(interval: 'month' | 'year', promoCode?: string) {
    setError(null)
    setPendingAction(interval === 'month' ? 'checkout-month' : 'checkout-year')
    try {
      const trimmedCode = promoCode?.trim()
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval, ...(trimmedCode ? { promoCode: trimmedCode } : {}) }),
      })
      const data = await response.json()
      if (!response.ok || !data.url) {
        setError(data.error ?? 'CHECKOUT_FAILED')
        setPendingAction(null)
        return
      }
      await redirectTo(data.url)
    } catch {
      setError('CHECKOUT_FAILED')
      setPendingAction(null)
    }
  }

  async function openPortal() {
    setError(null)
    setPendingAction('portal')
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await response.json()
      if (!response.ok || !data.url) {
        setError(data.error ?? 'PORTAL_FAILED')
        setPendingAction(null)
        return
      }
      await redirectTo(data.url)
    } catch {
      setError('PORTAL_FAILED')
      setPendingAction(null)
    }
  }

  return { startCheckout, openPortal, pendingAction, error }
}
