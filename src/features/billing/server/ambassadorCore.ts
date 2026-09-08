const DEFAULT_CODE_BASE = 'PROF'
const MAX_CODE_BASE_LENGTH = 12
const DISCOUNT_PER_REFERRAL = 10
const MAX_DISCOUNT_PERCENT = 100

// Base lisible pour le code personnel d'un ambassadeur : lettres uniquement,
// sans accents, en majuscules — ex. "Éloïse-Anne" → "ELOISEANNE".
export function normalizeNameForCode(firstName: string): string {
  const lettersOnly = firstName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()

  if (lettersOnly.length === 0) return DEFAULT_CODE_BASE
  return lettersOnly.slice(0, MAX_CODE_BASE_LENGTH)
}

// Liste ordonnée et déterministe de candidats de code pour un prénom donné.
// Le get-or-create (couche serveur, non pure) essaie ces candidats dans l'ordre
// jusqu'à en trouver un disponible — évite toute dépendance à un générateur
// aléatoire pour rester testable sans mock.
export function ambassadorCodeCandidates(firstName: string, count = 99): string[] {
  const base = normalizeNameForCode(firstName)
  return Array.from({ length: count }, (_, index) => `${base}${String(index + 1).padStart(2, '0')}`)
}

// Réduction cumulative sur l'abonnement de l'ambassadeur : 10% par filleul
// distinct, plafonnée à 100% (voir PRD-ambassadeurs.md, US-8).
export function ambassadorDiscountPercent(referralCount: number): number {
  const safeCount = Math.max(referralCount, 0)
  return Math.min(safeCount * DISCOUNT_PER_REFERRAL, MAX_DISCOUNT_PERCENT)
}

// Chaque palier de réduction correspond à un Coupon Stripe pré-créé au
// Dashboard (percent_off fixe, duration: forever) — jamais un montant
// recalculé dans notre code. Le nom de variable d'environnement est prévisible
// pour que la config (10 coupons, un par palier de 10 à 100) reste simple à
// vérifier. Voir docs/PLAN-ambassadeurs.md, Phase 3.
export function ambassadorCouponEnvVarName(discountPercent: number): string {
  return `STRIPE_COUPON_ID_AMBASSADOR_${discountPercent}`
}
