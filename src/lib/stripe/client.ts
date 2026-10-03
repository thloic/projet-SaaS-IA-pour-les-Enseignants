import 'server-only'
import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

// Instanciation paresseuse : `new Stripe()` lève immédiatement si la clé est
// absente. Instancier au chargement du module fait planter `next build` dès
// qu'une route qui importe ce fichier est collectée — même si la route n'est
// jamais réellement appelée (ex. STRIPE_SECRET_KEY pas encore configurée en
// local/CI). En paresseux, l'erreur ne survient qu'au premier vrai appel.
export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())
  }
  return stripeInstance
}
