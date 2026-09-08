# PRD — Programme ambassadeur (code promo, réduction cumulative)

## Problème

Aujourd'hui, un enseignant satisfait d'EducAssist n'a aucune incitation concrète à recommander l'outil à un collègue au-delà du bouche-à-oreille informel — recommander ne lui rapporte rien. Le chantier d'abonnement Stripe déjà en production a volontairement exclu les codes promo, en notant cette extension comme prochaine étape naturelle.

## Solution

Chaque enseignant dispose automatiquement d'un code promo personnel, visible et copiable depuis ses paramètres, qu'il peut partager avec un collègue. Chaque fois qu'un collègue s'abonne au plan Pro en utilisant ce code, l'enseignant qui possède le code (l'ambassadeur) voit son propre abonnement réduit de 10% supplémentaires, cumulable jusqu'à un abonnement entièrement gratuit.

## Utilisateur cible

- **L'ambassadeur** : un enseignant inscrit (gratuit ou Pro) qui recommande l'outil et est récompensé sur sa propre facture pour chaque collègue qui s'abonne grâce à lui.
- **Le filleul** : un collègue qui découvre EducAssist via cette recommandation et s'abonne au plan Pro au tarif plein, en indiquant le code de la personne qui le lui a recommandé.

## User Stories

1. En tant qu'enseignant, je veux voir mon code promo personnel dans mes paramètres dès mon inscription, afin de pouvoir le partager à un collègue à tout moment.
2. En tant qu'enseignant, je veux copier mon code en un clic, afin de le partager facilement par message ou courriel.
3. En tant qu'enseignant, je veux voir combien de collègues ont utilisé mon code et le pourcentage de réduction que ça me donne actuellement, afin de suivre l'effet concret de mes recommandations.
4. En tant qu'enseignant qui passe au plan Pro, je veux un champ optionnel pour indiquer le code d'un collègue qui m'a recommandé l'outil, afin de le créditer pour sa recommandation.
5. En tant qu'enseignant qui entre un code invalide ou inexistant, je veux un message d'erreur clair, afin de comprendre que le code n'a pas été pris en compte sans être bloqué dans mon parcours de paiement.
6. En tant qu'enseignant, je veux pouvoir laisser le champ code vide et m'abonner normalement, afin de ne pas être bloqué si je n'ai pas de code à indiquer.
7. En tant qu'enseignant qui tente d'indiquer son propre code, je veux un message m'indiquant que ce n'est pas autorisé, afin de comprendre pourquoi ça ne compte pas comme une recommandation.
8. En tant qu'ambassadeur, je veux que chaque nouveau collègue abonné grâce à mon code ajoute 10% de réduction supplémentaires à mon abonnement, jusqu'à un maximum de 100% (abonnement gratuit), afin d'être récompensé proportionnellement à mes recommandations.
9. En tant qu'ambassadeur déjà abonné, je veux que la réduction se mette à jour sur mon abonnement dès qu'un nouveau collègue s'abonne grâce à mon code, afin de voir l'effet immédiatement plutôt qu'au prochain renouvellement seulement.
10. En tant qu'ambassadeur pas encore abonné, je veux que ma réduction accumulée s'applique automatiquement le jour où je passe au plan Pro, afin de ne pas perdre l'avantage déjà mérité.
11. En tant qu'enseignant, je veux qu'un même collègue ne puisse être compté qu'une seule fois comme recommandation, afin d'éviter qu'un même filleul gonfle artificiellement la réduction d'un ambassadeur.

## Critères de succès

- Un enseignant peut voir et copier son code personnel depuis ses paramètres en 2 clics ou moins.
- Le nombre de collègues ayant utilisé le code d'un enseignant et son pourcentage de réduction actuel sont visibles dans ses paramètres.
- Un enseignant qui indique un code valide et distinct du sien à son propre checkout ne voit lui-même aucun changement de prix ; c'est l'ambassadeur propriétaire du code dont l'abonnement reflète le rabais supplémentaire.
- Après qu'un collègue s'est abonné avec un code valide, le pourcentage de réduction affiché chez l'ambassadeur augmente de 10 points, jusqu'à 100% maximum.
- Un ambassadeur déjà abonné voit le nouveau rabais reflété sur son abonnement sans avoir à se réabonner ou contacter le support.
- Un code invalide ou appartenant au même compte affiche un message d'erreur explicite, sans empêcher un paiement au tarif plein.
- Un même filleul ne peut déclencher qu'une seule fois la réduction chez un ambassadeur, même en cas de résiliation et réabonnement.

## Hors périmètre

- Rabais pour le filleul lui-même (il paie toujours plein tarif).
- Commission ou tout versement en argent réel à l'ambassadeur — uniquement une réduction sur son propre abonnement, jamais de paiement en argent.
- Système de parrainage à 1 mois offert pour le parrain (fonctionnalité 20) — mécanique séparée, non fusionnée ici.
- Codes promo créés ou attribués manuellement par l'équipe (campagnes marketing génériques) — uniquement les codes personnels auto-générés par compte.
- Date d'expiration ou limite de temps sur les codes.
- Paliers School et District (déjà hors périmètre du chantier abonnement existant).
- Remboursement rétroactif si le rabais aurait dû s'appliquer à une facture déjà payée avant la mise à jour du palier.

## Décisions d'implémentation

- Code personnel généré automatiquement à la création du compte, basé sur le nom de l'enseignant (ex: MARIE10) — lisible, mémorisable.
- Visible et copiable en un clic depuis la section paramètres du compte, avec le nombre de filleuls et le pourcentage de réduction actuel affichés juste à côté.
- Champ « code d'un collègue » optionnel dans l'écran de passage au plan Pro — ne modifie jamais le prix affiché pour la personne qui l'entre.
- Réduction cumulative de 10% par filleul distinct, plafonnée à 100%, appliquée sur l'abonnement de l'ambassadeur (jamais sur celui du filleul).
- La réduction se met à jour immédiatement sur un abonnement déjà actif ; pour un ambassadeur pas encore abonné, elle s'applique dès son premier passage au plan Pro.
- Un code ne peut pas être utilisé par le compte auquel il appartient (message d'erreur explicite).
- Un même filleul ne compte qu'une seule fois pour un ambassadeur donné, même après résiliation/réabonnement.

## Notes complémentaires

- S'appuie sur le chantier d'abonnement Stripe déjà en production (Free ↔ Pro) — cette fonctionnalité ajoute une réduction dynamique au flux de paiement existant, elle ne le remplace pas.
- Distincte de la fonctionnalité 20 (parrainage, 1 mois offert au parrain) — mécaniques différentes, pourront coexister plus tard.
- Risque à surveiller : un ambassadeur avec 10 filleuls ou plus obtient un abonnement Pro entièrement gratuit à vie — coût à surveiller si le programme devient très efficace ; le plafond à 100% est déjà prévu comme garde-fou.
