# Plan : Programme ambassadeur (code promo, réduction cumulative)

> PRD source : `docs/PRD-ambassadeurs.md`

## Décisions architecturales

- **Routes** : réutilise `/pricing` (champ code ajouté à l'écran de checkout existant) et `/settings` (nouvelle section « Code ambassadeur »). Pas de nouvelle page.
- **Schema** :
  - `ambassador_codes` (`user_id` unique → `auth.users`, `code` unique) — un code par compte, généré à la volée au premier accès.
  - `ambassador_redemptions` (`id`, `ambassador_user_id`, `referred_user_id` **unique**, `created_at`) — un enregistrement par filleul distinct ayant utilisé un code ; la contrainte unique sur `referred_user_id` garantit qu'un même filleul ne compte jamais deux fois, pour aucun ambassadeur, même après résiliation/réabonnement.
  - RLS sur les deux tables : lecture seule pour le propriétaire (`auth.uid() = user_id` / `auth.uid() = ambassador_user_id`), aucune policy d'écriture pour les utilisateurs authentifiés — même pattern que `subscriptions` (écriture uniquement via `service_role`, depuis le webhook Stripe pour les redemptions).
- **Modèle clé** : le palier de réduction d'un ambassadeur n'est jamais stocké — il est dérivé à la demande (`count(ambassador_redemptions) × 10, plafonné à 100`), pour que le compteur affiché et le rabais réellement appliqué ne puissent jamais diverger.
- **Frontière Stripe** : dix Coupons Stripe pré-créés au Dashboard (10%, 20%, … 100%, `duration: forever`) — prérequis de configuration, au même titre que les `price_id` du chantier abonnement. Le rabais d'un ambassadeur est toujours l'un de ces dix coupons fixes, jamais un montant calculé dynamiquement dans notre code (cohérence avec la règle déjà en place sur le chantier abonnement : jamais de prix dérivé d'une entrée utilisateur). Le webhook Stripe reste l'unique source de vérité pour toute écriture liée à la facturation — c'est lui, et seulement lui, qui enregistre une redemption et met à jour le rabais Stripe d'un ambassadeur déjà abonné.

---

## Phase 1 — Code personnel et compteur de filleuls

**User stories** : US-1, US-2, US-3

### Ce qu'on livre

Un enseignant ouvre ses paramètres et voit son code personnel (généré automatiquement s'il n'existe pas encore), le copie en un clic, et voit à côté combien de collègues l'ont utilisé et son pourcentage de réduction actuel (0% au départ). Le mécanisme de rabais réel n'est pas encore branché à cette phase — seule la visibilité l'est.

### Critères d'acceptation

- [ ] Un enseignant qui n'a jamais eu de code en voit un apparaître automatiquement à sa première visite des paramètres.
- [ ] Le code est lisible (basé sur le nom de l'enseignant) et copiable en un clic.
- [ ] Deux enseignants ne peuvent jamais obtenir le même code (unicité garantie).
- [ ] Le nombre de filleuls et le pourcentage de réduction actuel sont visibles et démarrent à 0.

## Bloquée par

Aucune — démarrable immédiatement. Nécessite la création manuelle préalable des dix Coupons Stripe (Dashboard) pour les phases suivantes, mais pas pour celle-ci.

---

## Phase 2 — Un filleul indique un code au checkout

**User stories** : US-4, US-5, US-6, US-7, US-11

### Ce qu'on livre

Sur l'écran de passage au plan Pro, un enseignant peut indiquer le code d'un collègue. Le code est validé (existence, pas son propre code) sans jamais changer le prix affiché pour la personne qui l'entre. Une fois le paiement confirmé, la recommandation est enregistrée de façon fiable et durable (un même filleul ne compte jamais deux fois) — visible immédiatement dans le compteur de l'ambassadeur (Phase 1).

### Critères d'acceptation

- [ ] Le champ code est optionnel ; laissé vide, le paiement se déroule normalement.
- [ ] Un code inexistant affiche un message d'erreur clair, sans bloquer un paiement sans code.
- [ ] Un enseignant qui indique son propre code reçoit un message explicite, la recommandation n'est pas enregistrée.
- [ ] Après le paiement confirmé d'un filleul avec un code valide, le compteur de l'ambassadeur correspondant passe à +1 dans ses paramètres.
- [ ] Un même filleul qui se réabonne plus tard (après résiliation) avec le même code n'incrémente pas le compteur une seconde fois.

## Bloquée par

- Phase 1

---

## Phase 3 — Réduction réelle appliquée sur l'abonnement de l'ambassadeur

**User stories** : US-8, US-9, US-10

### Ce qu'on livre

Le rabais cumulatif devient réel sur la facturation : au moment où l'ambassadeur passe lui-même au plan Pro, le rabais correspondant à son palier actuel s'applique dès la première facture. S'il est déjà abonné au moment où un nouveau filleul s'abonne grâce à son code, son rabais augmente immédiatement de 10 points sur son abonnement en cours, sans qu'il ait à rien faire.

### Critères d'acceptation

- [ ] Un ambassadeur qui passe au plan Pro avec des filleuls déjà comptabilisés voit le rabais correspondant appliqué dès sa première facture.
- [ ] Un ambassadeur déjà abonné voit son rabais augmenter de 10 points sur son abonnement existant dès qu'un nouveau filleul s'abonne grâce à son code, sans interruption de service.
- [ ] Le rabais total ne dépasse jamais 100%, quel que soit le nombre de filleuls.
- [ ] Le rabais reste appliqué à chaque renouvellement tant que l'ambassadeur reste abonné.

## Bloquée par

- Phase 2
