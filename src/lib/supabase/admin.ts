import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Client service_role : contourne RLS. Ne JAMAIS importer ce fichier depuis du
// code exécuté côté client, ni depuis une route qui ne soit pas le webhook
// Stripe (ou une tâche serveur de confiance équivalente) — c'est la seule
// façon d'écrire dans `subscriptions`/`stripe_webhook_events`, qui n'ont
// aucune policy RLS d'écriture pour les utilisateurs authentifiés.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
