# PRD — Abonnement Pro (paiement par carte)

## Problème

L'enseignant qui utilise le plan gratuit d'EducAssist atteint rapidement sa limite mensuelle de générations. Le produit l'informe qu'il doit passer au plan payant pour continuer — mais aucun moyen réel de payer n'existe aujourd'hui derrière ce message. L'enseignant se retrouve bloqué en pleine utilisation, précisément au moment où il vient de constater la valeur de l'outil pour gagner du temps, sans pouvoir donner suite à son intention de payer.

## Solution

L'enseignant peut sortir sa carte bancaire et payer directement dans l'application pour passer d'un plan gratuit limité à un plan Pro aux générations illimitées, au rythme de facturation de son choix (mensuel ou annuel). Une fois abonné, il gère son abonnement en autonomie complète — consulter son plan, changer de carte, récupérer ses factures, annuler — sans jamais avoir besoin de contacter le support.

## Utilisateur cible

Un enseignant individuel (primaire, secondaire ou universitaire, contexte canadien prioritaire) déjà utilisateur du plan gratuit, qui atteint sa limite mensuelle de générations et décide de payer de sa propre poche. Pas d'achat institutionnel, pas d'intermédiaire, pas de facturation à un établissement.

## User Stories

1. En tant qu'enseignant ayant atteint ma limite de générations gratuites, je veux pouvoir passer au plan payant directement depuis le message qui m'en informe, afin de continuer à utiliser l'outil sans interruption.
2. En tant qu'enseignant, je veux choisir entre une facturation mensuelle (25$/mois) et annuelle (250$/an), afin de choisir la formule qui correspond le mieux à mon budget.
3. En tant qu'enseignant, je veux entrer ma carte bancaire et confirmer mon paiement en quelques clics, afin d'activer mon accès Pro immédiatement.
4. En tant qu'enseignant venant de payer, je veux voir mon accès passer immédiatement à illimité, afin de reprendre mon travail sans attendre.
5. En tant qu'enseignant ayant abandonné son paiement en cours de route (onglet fermé, paiement annulé), je veux revenir à mon état précédent (plan gratuit, limite affichée normalement), afin de ne pas me retrouver dans un état ambigu.
6. En tant qu'enseignant Pro, je veux consulter mon plan actuel, ma prochaine date de renouvellement et mes factures depuis mes paramètres de compte, afin de garder le contrôle sur mon abonnement.
7. En tant qu'enseignant Pro, je veux mettre à jour ma carte bancaire depuis mes paramètres, afin d'éviter une interruption si mon ancienne carte expire.
8. En tant qu'enseignant Pro, je veux annuler mon abonnement en autonomie, afin de ne pas dépendre du support pour arrêter de payer.
9. En tant qu'enseignant qui vient d'annuler, je veux voir clairement jusqu'à quelle date je garde mon accès Pro, afin de savoir à quoi m'attendre.
10. En tant qu'enseignant dont l'abonnement résilié arrive à échéance, je veux repasser automatiquement au plan gratuit à la date affichée, sans action de ma part, afin de continuer à utiliser l'outil dans ses limites gratuites plutôt que d'être bloqué complètement.
11. En tant qu'enseignant Pro dont le paiement de renouvellement échoue, je veux être informé clairement et invité à mettre à jour ma carte, afin de corriger le problème avant de perdre mon accès.
12. En tant qu'enseignant Pro dont le paiement échoue une fois, je veux garder mon accès illimité pendant la période de grâce, afin de ne pas être pénalisé pour un incident ponctuel (carte expirée, plafond atteint).
13. En tant qu'enseignant dont toutes les tentatives de paiement ont échoué, je veux repasser automatiquement au plan gratuit à l'issue de la période de grâce, afin que mon accès reste cohérent avec ce que j'ai réellement payé.
14. En tant qu'enseignant, je veux recevoir un reçu après chaque paiement réussi, afin de pouvoir le conserver pour mes déclarations professionnelles.

## Critères de succès

- Un enseignant peut passer du plan gratuit au plan Pro (mensuel ou annuel) et effectuer une nouvelle génération immédiatement après la confirmation du paiement, sans être bloqué par l'ancienne limite.
- Un reçu de paiement est délivré à l'enseignant après chaque paiement réussi.
- Un enseignant peut voir, dans ses paramètres, son plan actuel et sa prochaine date de facturation.
- Un enseignant peut annuler son abonnement lui-même et voir s'afficher immédiatement la date jusqu'à laquelle il conserve son accès Pro — sans ouvrir de ticket support.
- Un enseignant dont le paiement échoue voit un message l'invitant à mettre à jour sa carte, et conserve son accès Pro jusqu'à épuisement des tentatives de renouvellement.
- Un enseignant dont l'abonnement se termine (résiliation arrivée à échéance, ou échec de paiement définitif) repasse au plan gratuit (3 générations/mois) sans intervention manuelle.

## Hors périmètre

- Paliers School et District (vente assistée, pas de paiement carte en self-service)
- Changement de fréquence en cours de cycle (mensuel ↔ annuel)
- Codes promo / coupons de réduction
- Programme d'affiliation/ambassadeurs (10% de commission) — cadrage séparé à venir
- Système de parrainage (fonctionnalité 20, séparée)
- Facturation institutionnelle (bons de commande, factures à l'établissement)
- Remboursements manuels hors politique standard
- Essai gratuit du plan Pro

## Décisions d'implémentation

- Deux formules : 25$/mois ou 250$/an — un seul palier Pro, deux fréquences de facturation, pas de palier intermédiaire.
- Le plan Pro débloque des générations illimitées sur toutes les fonctionnalités IA (agent conversationnel, cours, quiz, bulletin).
- Paiement par carte bancaire uniquement, en self-service, sans intervention humaine.
- Annulation : l'enseignant garde son accès Pro jusqu'à la fin de la période déjà payée, puis repasse automatiquement au plan gratuit.
- Échec de paiement au renouvellement : message d'alerte à l'enseignant, nouvelles tentatives automatiques pendant une période de grâce, accès Pro conservé pendant cette période ; retour au plan gratuit uniquement après épuisement des tentatives.
- Section "Abonnement" dans les paramètres du compte : plan actuel, prochaine date de facturation, historique de factures, changement de carte, annulation — tout en autonomie.
- Reçu envoyé automatiquement après chaque paiement réussi.

## Notes complémentaires

- Programme d'affiliation (10% de commission pour des ambassadeurs) confirmé comme prochaine étape, une fois ce lot en production — cadrage séparé requis, car il introduit un versement réel à des tiers, distinct du paiement entrant traité ici.
- Prochaine étape après validation de ce PRD : planification puis plan technique détaillé pour l'agent IA codeur, avec exigence de TDD (tests écrits avant le code) et de bonnes pratiques de sécurité propres à un système de paiement (vérification de signature webhook, idempotence, etc.) — la documentation officielle Stripe servira de référence à cette étape, hors périmètre du présent PRD.
- Risque connu identifié dans le code actuel : le champ `plan` existe déjà en base mais n'est vérifié nulle part — la limite de 3 générations/mois s'applique aujourd'hui à tout le monde, indépendamment du plan. La mise en place du paiement devra corriger ce point.
