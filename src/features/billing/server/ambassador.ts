import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ambassadorCodeCandidates,
  ambassadorCouponEnvVarName,
  ambassadorDiscountPercent,
} from '@/features/billing/server/ambassadorCore'

export interface AmbassadorSummary {
  code: string
  referralCount: number
  discountPercent: number
}

const UNIQUE_VIOLATION = '23505'

// Un enseignant peut créer son propre code (voir policy RLS insert dédiée sur
// `ambassador_codes`, contrairement à `subscriptions`/`ambassador_redemptions`
// qui n'acceptent d'écriture que depuis le webhook Stripe). On tente les
// candidats déterministes dans l'ordre jusqu'à en trouver un disponible.
export async function getOrCreateAmbassadorCode(userId: string, firstName: string): Promise<string> {
  const supabase = await createClient()

  const { data: existing, error: readError } = await supabase
    .from('ambassador_codes')
    .select('code')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) {
    console.error('[billing:ambassador] lecture du code ambassadeur refusée', readError)
    throw readError
  }
  if (existing) return existing.code

  for (const code of ambassadorCodeCandidates(firstName)) {
    const { error: insertError } = await supabase.from('ambassador_codes').insert({ user_id: userId, code })
    if (!insertError) return code

    if (insertError.code !== UNIQUE_VIOLATION) {
      console.error('[billing:ambassador] création du code ambassadeur refusée', insertError)
      throw insertError
    }

    // Conflit sur `user_id` : une requête concurrente vient de créer le code de
    // cet utilisateur (ex. double clic) — on le relit plutôt que d'en générer un autre.
    const { data: concurrent } = await supabase
      .from('ambassador_codes')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle()
    if (concurrent) return concurrent.code

    // Sinon, conflit sur `code` (collision avec un autre enseignant) : on
    // essaie le candidat suivant.
  }

  throw new Error('AMBASSADOR_CODE_GENERATION_EXHAUSTED')
}

async function countReferrals(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('ambassador_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('ambassador_user_id', userId)

  if (error) {
    console.error('[billing:ambassador] lecture des recommandations refusée', error)
    return 0
  }
  return count ?? 0
}

// Utilisé par le checkout de l'ambassadeur lui-même, pour appliquer d'emblée
// le rabais déjà mérité (voir docs/PLAN-ambassadeurs.md, Phase 3 / US-10).
export async function getAmbassadorReferralCount(userId: string): Promise<number> {
  return countReferrals(userId)
}

// Résout le Coupon Stripe pré-créé (Dashboard, `duration: forever`)
// correspondant à un palier de réduction. Ne lève jamais : un coupon manquant
// en configuration ne doit jamais empêcher un abonnement de se créer, ni
// bloquer indéfiniment un webhook en retry — on logue et on renvoie `null`
// (pas de rabais appliqué cette fois) plutôt que de planter.
export function getAmbassadorCouponId(discountPercent: number): string | null {
  if (discountPercent <= 0) return null

  const envVar = ambassadorCouponEnvVarName(discountPercent)
  const couponId = process.env[envVar]
  if (!couponId) {
    console.error(`[billing:ambassador] variable d’environnement manquante pour le palier ${discountPercent}% : ${envVar}`)
    return null
  }
  return couponId
}

// Résout le propriétaire d'un code au moment du checkout d'un filleul. La
// policy RLS de `ambassador_codes` ne permet à un enseignant de lire que SON
// PROPRE code — il faut donc un client `service_role` pour valider le code de
// quelqu'un d'autre ici. Usage strictement serveur (route de checkout),
// jamais exposé au client : seul un succès/échec de validation est renvoyé.
export async function findAmbassadorUserIdByCode(code: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ambassador_codes')
    .select('user_id')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    console.error('[billing:ambassador] résolution du code ambassadeur refusée', error)
    return null
  }
  return data?.user_id ?? null
}

export async function getAmbassadorSummary(userId: string, firstName: string): Promise<AmbassadorSummary> {
  const [code, referralCount] = await Promise.all([
    getOrCreateAmbassadorCode(userId, firstName),
    countReferrals(userId),
  ])

  return { code, referralCount, discountPercent: ambassadorDiscountPercent(referralCount) }
}
