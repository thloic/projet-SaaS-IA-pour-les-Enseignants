# Plan technique — Abonnement Pro (paiement Stripe)

> Source : `docs/PRD-abonnements.md`. Lire ce PRD en entier avant de commencer.
> Destiné à l'agent qui implémente. **Règle non négociable de ce chantier : pour chaque étape qui contient du code (5 à 10), écrire les tests d'abord, les faire échouer (rouge), puis implémenter jusqu'à ce qu'ils passent (vert).** Ne jamais écrire l'implémentation avant son test. Suivre l'ordre des étapes — chacune est vérifiable seule avant de passer à la suivante.

---

## Étape 0 — Vérifications avant de commencer

- `ls supabase/migrations/ | sort -V | tail` pour confirmer le prochain numéro de migration (dernier connu : `028_pat_generations.sql` → utiliser `029`, mais re-vérifier, des sessions concurrentes peuvent en ajouter).
- Relire l'état actuel de `src/features/billing/server/usage.ts` (mécanisme de quota existant, à étendre — ne pas le réécrire) et de `src/lib/supabase/server.ts`/`client.ts`/`middleware.ts` (patterns Supabase déjà en place).
- Confirmer dans `package.json` que `stripe` (^22.2.0) et `@stripe/stripe-js` (^9.7.0) sont bien installés (déjà le cas — ne pas les réinstaller).
- Ce chantier ne construit **que** Free ↔ Pro (mensuel/annuel). Ne pas coder les paliers School/District, les codes promo, le changement de fréquence en cours de cycle, ni le programme d'affiliation — tous explicitement hors périmètre (voir PRD).

---

## Règles de sécurité — non négociables

Ces règles s'appliquent à **tout** le code de ce chantier, pas seulement à l'étape webhook. Un système de paiement mal sécurisé a un coût réel (fraude, accès gratuit non détecté, litiges) — ce n'est pas un chantier où on "corrige plus tard".

1. **Le webhook Stripe est la seule source de vérité pour l'état d'un abonnement.** Aucune autre route ne doit jamais écrire dans la table `subscriptions`. En particulier, ne jamais faire confiance à une redirection de succès côté client (`success_url`) pour activer l'accès Pro — c'est juste une page d'attente, l'activation réelle vient du webhook (voir Étape 9).
2. **Toujours vérifier la signature du webhook** (`stripe.webhooks.constructEvent`) avec le **corps brut** de la requête (`await req.text()`, jamais `req.json()` qui reformate le payload et casse la vérification de signature) et `STRIPE_WEBHOOK_SECRET`. Un payload dont la signature ne vérifie pas est rejeté (400), jamais traité.
3. **Idempotence obligatoire côté webhook.** Stripe peut renvoyer le même événement plusieurs fois (retries réseau). Chaque `event.id` ne doit être traité qu'une seule fois — voir table `stripe_webhook_events` à l'Étape 3.
4. **La table `subscriptions` n'a aucune policy RLS d'écriture pour les utilisateurs authentifiés** (select uniquement). Toute écriture passe par un client Supabase `service_role` (qui contourne RLS), utilisé **uniquement** dans le handler webhook. Un enseignant ne doit jamais pouvoir se donner lui-même l'accès Pro via un appel API.
5. **Jamais de clé secrète côté client.** `STRIPE_SECRET_KEY` et `SUPABASE_SERVICE_ROLE_KEY` ne sont importés que dans des fichiers `server-only` (voir pattern déjà utilisé dans `usage.ts`). `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` n'est même pas nécessaire dans ce chantier : on utilise Stripe Checkout hébergé (redirection vers `session.url`), pas Stripe Elements embarqué — donc pas de formulaire de carte dans notre propre code, jamais de numéro de carte qui transite par notre serveur (hors scope PCI).
6. **Ne jamais dériver un montant ou un prix depuis une entrée utilisateur.** Le prix vient toujours d'un `price_id` Stripe configuré côté Dashboard (`STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_ANNUAL`), jamais d'un montant recalculé côté code.
7. **Toujours filtrer par `user_id` issu de la session serveur** (`getCurrentUser()`), jamais d'un id transmis par le client, pour toute route qui touche à la facturation (checkout, portail).
8. **Ne jamais logger de données sensibles** (numéro de carte — de toute façon jamais entre nos mains ; mais aussi éviter de logger des payloads Stripe complets en clair). Logger `event.id` et `event.type` suffit pour le diagnostic.

---

## Configuration Stripe Dashboard (prérequis, hors code)

À faire par le développeur avant/pendant l'implémentation — l'agent codeur ne peut pas le faire à sa place, mais doit lire les valeurs produites ici pour les env vars :

1. Créer deux **Prices** récurrents dans le Dashboard Stripe (mode Test d'abord) : un à 25$/mois, un à 250$/an. Noter leurs `price_id` (`price_...`) → `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`.
2. **Customer Portal** (Dashboard → Settings → Billing → Customer portal) : activer "Cancel subscriptions" (au terme de la période, pas immédiat — cocher l'option correspondante), activer "Update payment method", activer l'affichage de l'historique de factures.
3. **Smart Retries / dunning** (Dashboard → Settings → Billing → Subscriptions and emails) : activer les tentatives automatiques de renouvellement, et configurer "Cancel the subscription" comme action finale après épuisement des tentatives (pas "Mark as unpaid indéfiniment") — c'est ce qui garantit que le statut finit par passer à `canceled`, cohérent avec la logique de l'Étape 5.
4. **Emails automatiques** (Dashboard → Settings → Emails) : activer "Successful payments" (reçu automatique, couvre la US-14 sans code supplémentaire).
5. **Webhook endpoint** (Dashboard → Developers → Webhooks) : créer un endpoint pointant vers `${NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`, écouter au minimum : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Noter le signing secret → `STRIPE_WEBHOOK_SECRET`. En local, utiliser `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (Stripe CLI) pour obtenir un secret de test et déclencher des événements avec `stripe trigger checkout.session.completed`.
6. Ajouter dans `.env.example` (pas de vraies valeurs, comme le reste du fichier) :
   ```
   STRIPE_PRICE_ID_MONTHLY=
   STRIPE_PRICE_ID_ANNUAL=
   ```
   (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` existent déjà.)

---

## Étape 1 — Migration

Fichier `supabase/migrations/029_subscriptions.sql` :

```sql
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  status text not null check (status in ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
  price_interval text check (price_interval in ('month', 'year')),
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_stripe_customer_id_idx on public.subscriptions(stripe_customer_id);

alter table public.subscriptions enable row level security;

-- Lecture seule pour l'utilisateur concerné. Aucune policy insert/update/delete :
-- seul un client service_role (qui contourne RLS) peut écrire ici, depuis le webhook.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions for select
using (auth.uid() = user_id);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- RLS activé, aucune policy : ni les utilisateurs anonymes ni les utilisateurs
-- authentifiés n'ont accès à cette table, dans aucun sens. Seul service_role l'utilise.
alter table public.stripe_webhook_events enable row level security;

notify pgrst, 'reload schema';
```

Absence de ligne dans `subscriptions` pour un `user_id` donné = enseignant au plan gratuit (jamais souscrit). Pas besoin d'un statut `'none'`.

---

## Étape 2 — Fondations : client Stripe serveur + client Supabase admin

Pas de test unitaire dédié ici (fondations sans logique propre), mais vérifier `npx tsc --noEmit` après.

- `src/lib/stripe/client.ts` : exporter une fonction `getStripe()` qui instancie `new Stripe(process.env.STRIPE_SECRET_KEY!)` **paresseusement** (au premier appel, pas au chargement du module) et mémorise l'instance. Instancier au chargement du module fait planter `next build` dès qu'une route qui importe ce fichier est collectée par Next.js — même si la route n'est jamais réellement invoquée — dès que `STRIPE_SECRET_KEY` est vide (le cas tant que le Dashboard n'est pas configuré). Vérifié en implémentant : l'eager casse le build avec `Neither apiKey nor config.authenticator provided`.

- `src/lib/supabase/admin.ts` :
  ```ts
  import 'server-only'
  import { createClient as createSupabaseClient } from '@supabase/supabase-js'

  // Client service_role : contourne RLS. Ne JAMAIS importer ce fichier depuis
  // du code exécuté côté client, ni depuis une route qui ne soit pas le webhook
  // Stripe ou une tâche serveur de confiance équivalente.
  export function createAdminClient() {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  ```

---

## Étape 3 — Gating du quota (`usage.ts`)

**Tests d'abord** — étendre `tests/unit/billing-usage.test.ts` (nouveau fichier si absent). Injecter un dépôt d'abonnement factice (même pattern d'injection que le reste du projet — un second paramètre optionnel, un vrai client Supabase par défaut, un double en mémoire en test) :

- utilisateur avec un abonnement `status: 'active'` → `checkAndIncrementUsage` retourne `allowed: true`, **sans** incrémenter `usage_counters`.
- utilisateur avec `status: 'past_due'` → `allowed: true` aussi (période de grâce, US-12).
- utilisateur avec `status: 'canceled'` ou `'unpaid'` → traité comme gratuit, limite normale appliquée.
- utilisateur sans aucune ligne dans `subscriptions` → comportement actuel inchangé (limite gratuite).
- `getUsage` reflète un statut "illimité" pour un utilisateur Pro actif (ex. `limit: -1` comme convention "illimité", à utiliser aussi côté UI).

**Implémentation** :

- `src/features/billing/server/subscription.ts` (nouveau) : `hasActiveProAccess(userId, deps?)` — lit `subscriptions` filtré par `user_id`, retourne `true` si `status in ('active', 'past_due')`, `false` sinon (y compris absence de ligne). Prend un paramètre optionnel de dépôt injectable pour les tests, comme évoqué ci-dessus.
- `src/features/billing/server/usage.ts` : `checkAndIncrementUsage` appelle `hasActiveProAccess` en premier ; si vrai, retourne `{ allowed: true, used: 0, limit: -1 }` sans toucher `usage_counters`. Sinon, comportement actuel inchangé.
- `src/components/shared/GenerationCounter.tsx` : si `limit === -1`, afficher un état "Illimité" au lieu de la barre de progression (pas de division par zéro, pas de pourcentage).

---

## Étape 4 — Checkout

**Tests d'abord** — `tests/unit/billing-checkout.test.ts` : extraire la construction des paramètres de session dans une fonction pure `buildCheckoutSessionParams({ userId, email, interval, existingCustomerId })`, testée sans appeler Stripe :

- `interval: 'month'` → utilise `STRIPE_PRICE_ID_MONTHLY`, `interval: 'year'` → `STRIPE_PRICE_ID_ANNUAL`.
- `client_reference_id` et `subscription_data.metadata.supabase_user_id` valent tous les deux `userId` (redondance volontaire, voir Étape 6).
- `success_url` et `cancel_url` pointent vers `${NEXT_PUBLIC_APP_URL}/settings?checkout=success` et `.../settings?checkout=cancelled`.
- Si `existingCustomerId` fourni, il est passé tel quel (`customer: existingCustomerId`) plutôt que de laisser Stripe recréer un client.
- `interval` ni monthly ni yearly → lève une erreur (garde-fou, ne doit jamais arriver via un formulaire contrôlé mais coûte rien à vérifier).

**Implémentation** :

- `src/features/billing/schemas/billingSchema.ts` : `checkoutInputSchema = z.object({ interval: z.enum(['month', 'year']) })`.
- `src/features/billing/server/checkout.ts` : `buildCheckoutSessionParams(...)` (fonction pure testée ci-dessus).
- `src/app/api/billing/checkout/route.ts` (remplacer le stub) : `getCurrentUser()` (401 si absent) → valider le body via `checkoutInputSchema` → chercher un `stripe_customer_id` existant pour cet utilisateur dans `subscriptions` (réutiliser si trouvé, même si l'abonnement précédent est `canceled` — évite de dupliquer des clients Stripe) → `buildCheckoutSessionParams` → `stripe.checkout.sessions.create(params)` → `Response.json({ url: session.url })`. Le composant client fait `window.location.href = url` (pas besoin de `@stripe/stripe-js` pour une redirection simple vers Checkout hébergé).

---

## Étape 5 — Webhook (l'étape la plus critique — la plus testée)

**Tests d'abord**, deux fichiers séparés :

1. `tests/unit/stripe-webhook-signature.test.ts` — utiliser `stripe.webhooks.generateTestHeaderString({ payload, secret })` (fourni par le SDK, pas d'appel réseau) pour signer un payload de test :
   - signature valide + bon secret → `constructEvent` retourne l'événement.
   - signature invalide ou secret erroné → lève une erreur, la route doit répondre 400.
   - en-tête `stripe-signature` absent → 400 avant même d'essayer de vérifier.

2. `tests/unit/stripe-webhook-handler.test.ts` — extraire la logique de traitement dans une fonction pure `handleStripeEvent(event, deps)` où `deps` est un dépôt injectable (même pattern qu'ailleurs dans le projet), testée avec des fixtures d'événements Stripe construites à la main (objet TypeScript, pas besoin du SDK réseau) :
   - `checkout.session.completed` avec `subscription` et `metadata.supabase_user_id` → upsert d'une ligne `subscriptions` avec le bon `user_id`, `status`, `price_interval`, `current_period_end` convertis.
   - `customer.subscription.updated` (`status: 'past_due'`) → met à jour la ligne existante, ne change pas `user_id`.
   - `customer.subscription.deleted` → upsert avec `status: 'canceled'`.
   - même `event.id` traité deux fois → la deuxième fois est un no-op.
   - **important** : l'événement n'est marqué traité (écriture dans `stripe_webhook_events`) qu'**après** un traitement réussi, jamais avant. Si l'écriture échoue, l'événement ne doit PAS être marqué — sinon un retry Stripe (après une réponse 500) serait ignoré à tort comme "déjà traité" et la correction ne serait jamais rejouée. Tester explicitement ce cas : upsert qui échoue → l'event.id reste "non traité".
   - type d'événement non géré (ex. `invoice.finalized`) → acquitté sans erreur, aucune écriture dans `subscriptions`.
   - `metadata.supabase_user_id` absent d'un événement `checkout.session.completed` → logue une erreur, n'écrit rien (ne doit jamais planter le process, mais ne doit pas non plus deviner un utilisateur).

**Implémentation** :

- `src/features/billing/server/stripeWebhookCore.ts` : `handleStripeEvent(event, deps)` — un `switch (event.type)` sur les trois types listés à l'Étape "Configuration Stripe Dashboard" (`customer.subscription.updated` et `customer.subscription.deleted` partagent la même fonction interne, la forme de `event.data.object` est identique). Extraire `user_id` depuis `subscription.metadata.supabase_user_id` (ou `client_reference_id` de la session pour `checkout.session.completed` en repli).
  **Piège vérifié en implémentant** : dans le SDK `stripe` installé (22.x), `current_period_end` n'est **pas** un champ de `Stripe.Subscription` — il vit sur chaque `Stripe.SubscriptionItem` (`subscription.items.data[0].current_period_end`). Vérifier dans `node_modules/stripe/cjs/resources/Subscriptions.d.ts` / `SubscriptionItems.d.ts` plutôt que de supposer la forme de l'API à partir de la documentation générale ou d'une version antérieure du SDK.
- `src/app/api/webhooks/stripe/route.ts` (remplacer le stub) :
  ```ts
  export const runtime = 'nodejs'

  export async function POST(req: Request) {
    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature')
    if (!signature) return new Response('Missing signature', { status: 400 })

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (error) {
      console.error('[stripe-webhook] signature invalide', error)
      return new Response('Invalid signature', { status: 400 })
    }

    const admin = createAdminClient()
    const { error: dedupeError } = await admin
      .from('stripe_webhook_events')
      .insert({ id: event.id, type: event.type })

    if (dedupeError) {
      // Conflit de clé primaire = événement déjà traité (retry Stripe) : on
      // acquitte sans retraiter, jamais une erreur pour Stripe.
      return new Response('OK', { status: 200 })
    }

    await handleStripeEvent(event, { admin })
    return new Response('OK', { status: 200 })
  }
  ```
  Ne jamais utiliser `req.json()` dans cette route (casse la signature). `runtime = 'nodejs'` explicite (le SDK Stripe n'est pas compatible edge runtime).

---

## Étape 6 — Portail de gestion (billing portal)

**Tests d'abord** — `tests/unit/billing-portal.test.ts`, même approche qu'à l'Étape 4 : fonction pure qui construit les paramètres (`customer`, `return_url`), testée sans appeler Stripe. Cas à couvrir : utilisateur sans `stripe_customer_id` en base (jamais souscrit) → la fonction ne doit pas être appelable, la route doit répondre une erreur explicite plutôt qu'un crash Stripe.

**Implémentation** :

- `src/app/api/billing/portal/route.ts` (nouveau) : `getCurrentUser()` → lire `stripe_customer_id` depuis `subscriptions` pour cet utilisateur → si absent, `Response.json({ error: 'NO_SUBSCRIPTION' }, { status: 400 })` → sinon `stripe.billingPortal.sessions.create({ customer, return_url: ... })` → `Response.json({ url: session.url })`.

---

## Étape 7 — Interface : section "Abonnement" dans les paramètres

Pas de nouveau test unitaire pur ici (composants UI + lecture directe de `subscriptions`), mais vérifier manuellement les trois états après implémentation (voir Étape 9).

- `src/features/billing/server/subscription.ts` : ajouter `getSubscriptionSummary(userId)` — retourne `{ plan: 'free' | 'pro', interval: 'month' | 'year' | null, currentPeriodEnd: string | null, cancelAtPeriodEnd: boolean }` à partir de `hasActiveProAccess` + la ligne `subscriptions`.
- `src/app/(dashboard)/settings/page.tsx` : charger `getSubscriptionSummary(user.id)` en plus de `getUsage`, le passer à `SettingsForm`.
- Nouveau composant `src/features/billing/components/SubscriptionSection.tsx` (client) :
  - Plan gratuit → deux boutons "S'abonner — 25$/mois" et "S'abonner — 250$/an", chacun `POST /api/billing/checkout` avec le bon `interval` puis `window.location.href = url`.
  - Plan Pro actif → affiche le prochain renouvellement (`currentPeriodEnd`), un bouton "Gérer mon abonnement" → `POST /api/billing/portal` → redirection.
  - Plan Pro avec `cancelAtPeriodEnd: true` → bannière "Votre accès Pro se termine le [date]" (US-9), toujours le bouton "Gérer mon abonnement" pour se réabonner via le portail.
  - Gérer l'état `?checkout=success` (US-4/US-5) : à l'arrivée sur cette query, ne **jamais** afficher "vous êtes Pro" immédiatement (le webhook n'a peut-être pas encore été traité) — afficher un état "Activation en cours…" et appeler `router.refresh()` après un court délai (2-3s), une seule fois. `?checkout=cancelled` → aucun message d'erreur, l'utilisateur a juste annulé, état inchangé (US-5).

---

## Étape 8 — CTA depuis le message de limite atteinte

- Repérer les points d'entrée existants où `usage.allowed === false` est déjà géré (au moins `src/app/api/agent/chat/route.ts:275`, message `limit` défini ligne 52 — vérifier aussi `course/generate`, `quiz.actions.ts`, `adaptation.actions.ts`, `bulletin.actions.ts`, `correctionOrchestration.ts`, qui appellent tous `checkAndIncrementUsage`).
- Ajouter un lien vers `/settings` (ancre ou state qui ouvre directement la section Abonnement) dans l'affichage de ce message côté UI, sans dupliquer la logique de blocage déjà correcte — c'est un ajout d'UX, pas une réécriture du gating.

---

## Étape 9 — Vérification finale

- `npx tsc --noEmit`
- `npx eslint .`
- `npm run test:unit` et `npm run test:integration` — tous les tests écrits aux étapes 3 à 6 doivent passer, en plus des tests existants (ne rien casser).
- `npm run build`
- Test manuel en mode Stripe Test avec `stripe listen` + `stripe trigger checkout.session.completed` / `stripe trigger customer.subscription.updated` / `stripe trigger customer.subscription.deleted` pour confirmer que le webhook local répond 200 et que `subscriptions` se met à jour.
- Vérifier qu'un événement webhook rejoué manuellement (même `event.id`) ne duplique rien.

---

## Hors périmètre (rappel, ne pas déborder)

- Paliers School et District, changement de fréquence en cours de cycle, codes promo, programme d'affiliation, parrainage, facturation institutionnelle, remboursements manuels, essai gratuit — tous explicitement exclus par le PRD.
- Rate limiting sur les routes de facturation (gap connu du projet, pas spécifique à ce chantier — à traiter séparément).
- Emails de reçu personnalisés : couverts par la configuration Dashboard (Étape "Configuration Stripe Dashboard", point 4), pas de code à écrire.
