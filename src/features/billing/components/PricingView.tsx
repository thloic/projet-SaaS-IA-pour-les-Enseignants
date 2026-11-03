'use client'

import { useState } from 'react'
import { Check, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBilling } from '@/features/billing/hooks/useBilling'
import { useAppLocale } from '@/features/i18n/AppLocaleProvider'

const BRAND = '#534AB7'

const FEATURES = {
  fr: [
    'Participation mensuelle à la plateforme EducAssist',
    'Utilisation de votre propre clé API pour les générations IA',
    "Votre consommation IA est facturée directement par votre fournisseur",
    "Agent IA connecté à l'historique de vos élèves",
    'Génération de cours, quiz et évaluations',
    'Commentaires de bulletin et PAT',
    "Gestion des classes et carnets d'élèves",
    'Présences, observations et notes',
    'Adaptations pédagogiques (DYS, TDAH, allophone…)',
    'Exports DOCX et PDF illimités',
    'Historique de tous vos documents',
  ],
  en: [
    'Monthly participation in the EducAssist platform',
    'Use your own API key for AI generations',
    'Your AI usage is billed directly by your provider',
    'AI agent connected to your student history',
    'Lessons, quizzes, and assessments generation',
    'Report card comments and PATs',
    'Class and student record management',
    'Attendance, observations, and gradebook',
    'Pedagogical adaptations (DYS, ADHD, allophone…)',
    'Unlimited DOCX and PDF exports',
    'Full document history',
  ],
  es: [
    'Participación mensual en la plataforma EducAssist',
    'Uso de su propia clave API para las generaciones de IA',
    'El consumo de IA se factura directamente por su proveedor',
    'Agente IA conectado al historial de sus alumnos',
    'Generación de lecciones, cuestionarios y evaluaciones',
    'Comentarios de boletín y PAT',
    'Gestión de clases y registros de alumnos',
    'Asistencia, observaciones y notas',
    'Adaptaciones pedagógicas (DYS, TDAH, alófonos…)',
    'Exportaciones DOCX y PDF ilimitadas',
    'Historial completo de documentos',
  ],
}

const COPY = {
  fr: {
    title: 'Rejoignez la plateforme',
    subtitle: 'Une participation accessible, avec votre propre clé API et sans frais IA cachés chez EducAssist.',
    monthly: {
      name: 'Participation EducAssist',
      price: '10 $ US',
      period: '/ mois',
      audience: 'Résiliable à tout moment',
      cta: 'Participer pour 10 $ US / mois',
    },
    currentPlan: 'Votre offre actuelle',
    alreadyPro: 'Votre participation à EducAssist est active.',
    manageLink: 'Gérer mon abonnement →',
    included: 'Ce que comprend votre participation',
    promoCodeLabel: 'Code d’un collègue (optionnel)',
    promoCodePlaceholder: 'ex. MARIE01',
    promoCodeHint: 'Ne change pas votre prix — ça réduit l’abonnement de la personne qui vous l’a partagé.',
    promoCodeInvalid: 'Ce code n’existe pas.',
    promoCodeOwn: 'Vous ne pouvez pas utiliser votre propre code.',
    checkoutFailed: 'Une erreur est survenue, réessayez.',
  },
  en: {
    title: 'Join the platform',
    subtitle: 'Accessible participation using your own API key, with no hidden AI charges from EducAssist.',
    monthly: {
      name: 'EducAssist participation',
      price: '$10 US',
      period: '/ month',
      audience: 'Cancel anytime',
      cta: 'Participate for $10 US / month',
    },
    currentPlan: 'Your current plan',
    alreadyPro: 'Your EducAssist participation is active.',
    manageLink: 'Manage my subscription →',
    included: 'What your participation includes',
    promoCodeLabel: 'A colleague’s code (optional)',
    promoCodePlaceholder: 'e.g. MARIE01',
    promoCodeHint: 'Doesn’t change your price — it reduces the subscription of whoever shared it with you.',
    promoCodeInvalid: 'This code doesn’t exist.',
    promoCodeOwn: 'You can’t use your own code.',
    checkoutFailed: 'Something went wrong, please try again.',
  },
  es: {
    title: 'Únase a la plataforma',
    subtitle: 'Una participación accesible con su propia clave API y sin cargos ocultos de IA por parte de EducAssist.',
    monthly: {
      name: 'Participación EducAssist',
      price: '10 $ US',
      period: '/ mes',
      audience: 'Cancelable en cualquier momento',
      cta: 'Participar por 10 $ US / mes',
    },
    currentPlan: 'Su plan actual',
    alreadyPro: 'Su participación en EducAssist está activa.',
    manageLink: 'Gestionar mi suscripción →',
    included: 'Lo que incluye su participación',
    promoCodeLabel: 'Código de un colega (opcional)',
    promoCodePlaceholder: 'ej. MARIE01',
    promoCodeHint: 'No cambia su precio — reduce la suscripción de quien se lo compartió.',
    promoCodeInvalid: 'Este código no existe.',
    promoCodeOwn: 'No puede usar su propio código.',
    checkoutFailed: 'Ocurrió un error, inténtelo de nuevo.',
  },
}

interface PricingViewProps {
  currentPlan: 'free' | 'pro'
}

export default function PricingView({ currentPlan }: PricingViewProps) {
  const { locale } = useAppLocale()
  const lang = locale === 'fr' || locale === 'en' || locale === 'es' ? locale : 'fr'
  const c = COPY[lang]
  const features = FEATURES[lang]
  const { startCheckout, openPortal, pendingAction, error } = useBilling()
  const [promoCode, setPromoCode] = useState('')

  const isCurrent = currentPlan === 'pro'

  const promoCodeError =
    error === 'INVALID_PROMO_CODE'
      ? c.promoCodeInvalid
      : error === 'OWN_PROMO_CODE_NOT_ALLOWED'
        ? c.promoCodeOwn
        : error
          ? c.checkoutFailed
          : null

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      {currentPlan === 'pro' && (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-600 flex items-center justify-between">
          <span>{c.alreadyPro}</span>
          <button
            onClick={() => openPortal()}
            disabled={pendingAction !== null}
            className="font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            {c.manageLink}
          </button>
        </div>
      )}

      {currentPlan === 'free' && (
        <div className="space-y-1.5">
          <Label htmlFor="promo-code">{c.promoCodeLabel}</Label>
          <Input
            id="promo-code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder={c.promoCodePlaceholder}
            disabled={pendingAction !== null}
            className="max-w-xs uppercase"
          />
          <p className="text-xs text-muted-foreground">{c.promoCodeHint}</p>
          {promoCodeError && <p className="text-xs text-destructive">{promoCodeError}</p>}
        </div>
      )}

      <div className="mx-auto grid max-w-xl gap-4">
        <div
          className={`flex flex-col rounded-2xl border p-6 space-y-5 ${
            isCurrent ? 'border-primary ring-2 ring-primary/20' : 'border-primary/50 bg-primary/5'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <p className="font-bold text-lg">{c.monthly.name}</p>
              {isCurrent && (
                <Badge style={{ backgroundColor: BRAND, color: 'white' }} className="text-[10px]">
                  {c.currentPlan}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{c.monthly.audience}</p>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-extrabold">{c.monthly.price}</span>
            <span className="text-sm text-muted-foreground mb-1">{c.monthly.period}</span>
          </div>
          <Button
            onClick={() => startCheckout(promoCode)}
            disabled={pendingAction !== null || currentPlan === 'pro'}
            className="w-full font-bold text-white h-10"
            style={{ backgroundColor: BRAND }}
          >
            {c.monthly.cta}
          </Button>
        </div>

      </div>

      {/* Features */}
      <div className="rounded-2xl border border-border bg-muted/20 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Crown size={15} className="text-amber-400" />
          <p className="font-semibold text-sm">{c.included}</p>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
