# PRD — Historique des documents générés et modification conversationnelle

## Problème

L'enseignant qui génère un PAT le perd dès qu'il quitte l'écran — rien n'est conservé, contrairement au bulletin. S'il veut l'ajuster plus tard ou le retrouver, il doit tout régénérer depuis zéro en retapant le contexte. Et pour toucher un point précis d'un document déjà produit, il n'a aucun moyen de le demander directement à l'agent — seule l'édition manuelle des champs est possible.

## Solution

Chaque document généré par l'agent (PAT, commentaire de bulletin) est conservé automatiquement. L'enseignant retrouve tous les documents générés dans une page d'historique unique, filtrable par élève ou par type. Il peut aussi demander à l'agent, en langage naturel et à tout moment, de modifier un document déjà généré pour un élève — l'agent retrouve le document le plus récent, le régénère dans son intégralité avec les mêmes garanties de qualité qu'à la première génération, et l'enseignant relit le résultat avant de le considérer définitif.

## Utilisateur cible

Enseignant du primaire ou du secondaire qui utilise déjà l'agent pour générer des PAT et des commentaires de bulletin, et qui a besoin de revenir sur un document généré — pour le retrouver plus tard, ou l'ajuster sans tout retaper.

## User Stories

1. En tant qu'enseignant, je veux que chaque PAT généré soit automatiquement conservé, afin de le retrouver plus tard sans le régénérer.
2. En tant qu'enseignant, je veux consulter une page listant tous les documents générés (PAT et bulletin), afin d'avoir un seul endroit où chercher.
3. En tant qu'enseignant, je veux filtrer cette liste par élève ou par type de document, afin de retrouver rapidement ce que je cherche.
4. En tant qu'enseignant, je veux demander à l'agent de modifier un document déjà généré pour un élève, en langage naturel, afin de ne pas tout retaper pour un ajustement.
5. En tant qu'enseignant, je veux que l'agent retrouve automatiquement le document le plus récent de cet élève, afin de ne pas avoir à préciser lequel s'il y en a plusieurs.
6. En tant qu'enseignant, je veux que le document modifié respecte les mêmes règles que la génération initiale, afin de garder la même confiance dans le résultat.
7. En tant qu'enseignant, je veux relire le document modifié avant qu'il devienne définitif, comme pour toute génération.
8. En tant qu'enseignant, je veux que chaque modification crée une nouvelle entrée plutôt que d'effacer la précédente, afin de garder une trace de l'évolution du document.
9. En tant qu'enseignant ayant atteint sa limite de générations gratuites, je veux qu'une modification soit bloquée comme une nouvelle génération, afin de comprendre pourquoi.
10. En tant qu'enseignant demandant une modification pour un élève sans document existant, je veux un message clair plutôt qu'un document inventé.

## Critères de succès

- Un PAT généré est retrouvable dans l'historique immédiatement après sa génération, sans action supplémentaire.
- La page d'historique affiche PAT et bulletin ensemble, triés par date, filtre par élève et par type opérationnel.
- Une demande de modification aboutit à un document régénéré cohérent, affiché pour relecture.
- Une modification demandée pour un élève sans document produit un message explicite, jamais une génération inventée.
- Le nombre de documents dans l'historique augmente à chaque génération et à chaque modification — rien n'est jamais perdu.

## Hors périmètre

- Modification ciblée d'un seul champ (le document est toujours régénéré en entier).
- Sélection manuelle d'une version précise si plusieurs documents existent — toujours la plus récente en V1.
- Suppression d'un document de l'historique.
- Export DOCX du bulletin (seul le PAT s'exporte aujourd'hui — inchangé).
- Historique partagé entre enseignants — reste strictement privé à chacun.

## Décisions d'implémentation

- Chaque génération ou modification crée une nouvelle entrée ; rien n'est jamais modifié en place.
- La page d'historique remplace la page actuelle listant uniquement les bulletins.
- La modification passe par la même relecture obligatoire que la génération initiale.
- La modification consomme le quota de générations gratuites, comme une génération initiale.
- Si l'élève n'a aucun document existant du type demandé, l'agent le signale au lieu de générer à l'aveugle.

## Notes complémentaires

- L'export DOCX du PAT existant n'est pas affecté — reste strictement additif.
- Indépendant du chantier « carnet de résultats » en cours en parallèle (aucune dépendance technique).
