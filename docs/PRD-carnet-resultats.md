# PRD — Carnet de résultats par classe

## Problème

L'enseignant qui prépare ses commentaires de bulletin doit se souvenir seul de tous les résultats d'un élève sur le trimestre — sans registre centralisé dans l'app, il les retrouve ailleurs (papier, tableur personnel) ou les retape de mémoire, ce qui rend la préparation groupée de fin de trimestre longue et source d'oubli.

## Solution

Dans chaque classe, l'enseignant renseigne les résultats d'évaluation de ses élèves — en une saisie groupée pour toute la classe (le cas principal, pensé pour une préparation de fin de trimestre), ou au fil de l'eau après une évaluation isolée. Quand l'enseignant demande à l'agent un commentaire de bulletin pour un élève, l'agent consulte automatiquement ces résultats ainsi que les observations déjà notées en classe pour rédiger le commentaire, sans que l'enseignant ait à les rappeler. Si aucune des deux sources n'existe pour cet élève, l'agent le signale plutôt que d'inventer un contenu.

## Utilisateur cible

Enseignant du primaire ou du secondaire ayant déjà créé sa classe et ses élèves, qui évalue régulièrement au fil du trimestre et doit, à un moment donné (journée pédagogique ou équivalent), produire un commentaire par élève et par matière en s'appuyant sur ces résultats.

## User Stories

1. En tant qu'enseignant, je veux ouvrir une grille de saisie pour toute ma classe, afin d'enregistrer en une fois les résultats d'une évaluation pour tous mes élèves.
2. En tant qu'enseignant, je veux pouvoir laisser un ou plusieurs élèves sans note dans cette grille, afin de ne pas être bloqué si un résultat manque encore.
3. En tant qu'enseignant, je veux donner un titre court à une évaluation (ex. « Contrôle fractions »), afin de m'y retrouver plus tard, sans que ce soit obligatoire.
4. En tant qu'enseignant, je veux aussi ajouter le résultat d'un seul élève à tout moment, afin de compléter au fil de l'eau sans repasser par la grille complète.
5. En tant qu'enseignant, je veux revoir les résultats déjà saisis pour ma classe, afin de vérifier ou corriger une erreur.
6. En tant qu'enseignant, je veux pouvoir supprimer un résultat saisi par erreur, afin de garder un historique fiable.
7. En tant qu'enseignant, je veux que l'agent utilise automatiquement les résultats et observations déjà notés sur un élève pour un commentaire de bulletin, afin de ne pas les répéter.
8. En tant qu'enseignant, je veux que l'agent me signale clairement s'il n'a rien trouvé sur un élève, afin de comprendre pourquoi il ne peut pas générer, plutôt que de recevoir un texte générique.
9. En tant qu'enseignant utilisant un système de notation non chiffré (lettres, paliers), je veux que mes résultats restent dans ce format, afin de rester cohérent avec mes habitudes.

## Critères de succès

- Un enseignant saisit les résultats de toute sa classe pour une évaluation en une seule session, sans recharger d'écran par élève.
- Un commentaire généré pour un élève avec des données reflète des éléments réels de ces données, jamais un texte générique.
- Une demande pour un élève sans aucune donnée (ni résultat ni observation) produit un message explicite, jamais un commentaire inventé.
- Un résultat saisi est immédiatement disponible pour l'agent, sans synchronisation manuelle.

## Hors périmètre

- Calcul de moyenne, pondération entre évaluations, ou note finale de bulletin — l'agent synthétise, il ne calcule pas.
- Lien avec le module Correction IA — carnet indépendant.
- Export vers un système de notes externe ou un bulletin officiel.
- Saisie ou modification des résultats par la voix/le chat de l'agent — reporté à une itération suivante (voir Notes complémentaires).
- Gestion de types d'évaluation pondérés (examen final vs devoir) — toutes les évaluations ont le même poids implicite pour cette V1.

## Décisions d'implémentation

- La saisie groupée (grille classe × évaluation) est le mode principal ; une saisie individuelle reste possible à tout moment.
- Le titre de l'évaluation est un champ court, optionnel.
- Le format de la note suit le système de notation déjà choisi par l'enseignant dans son profil (chiffré, lettres, paliers...), sans conversion ni validation de plage.
- Avant de générer un commentaire de bulletin, l'agent doit trouver au moins une donnée sur l'élève dans cette classe (un résultat OU une observation) ; l'absence des deux bloque la génération avec un message explicite — indépendamment du blocage déjà existant sur l'absence de modèle de document.
- L'agent reçoit l'ensemble des résultats et observations récents de l'élève (pas un résumé pré-calculé côté serveur) et rédige lui-même le commentaire en tenant compte de tout cela.

## Notes complémentaires

- Évolution naturelle mais non incluse ici : permettre à l'enseignant de dicter un résultat à l'agent en langage libre (« Loïc a eu 16/20 au contrôle de fractions ») — même mécanisme que l'entrée conversationnelle des observations déjà prévue séparément, à construire une fois celle-ci livrée.
- Dépend du chantier « observation conversationnelle » déjà cadré pour la partie « agent consulte les observations » — ce PRD suppose que les observations existent déjà, peu importe si elles viennent de la séance de classe ou du chat.
