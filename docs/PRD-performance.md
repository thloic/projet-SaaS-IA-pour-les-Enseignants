# PRD — Réactivité de l'interface (latence perçue sur chaque clic)

## Problème

Chaque interaction de l'enseignant avec l'application — cliquer sur un bouton, changer de page, sélectionner une classe — est suivie d'un délai perceptible avant que l'interface ne réagisse. Cette latence générale, présente sur l'ensemble du produit plutôt que sur une fonctionnalité isolée, nuit à la sensation de fluidité et de fiabilité attendue d'un outil censé faire gagner du temps à un enseignant déjà pressé.

## Solution

L'enseignant obtient une réaction quasi-instantanée à chaque clic et chaque navigation, sans avoir à se demander si l'application a bien pris en compte son action. Quand une action prend malgré tout du temps (génération IA, chargement d'une liste), un signal visuel clair l'indique immédiatement plutôt que de laisser l'interface figée sans retour.

## Utilisateur cible

Tout enseignant utilisant l'application au quotidien, sur l'ensemble des modules déjà livrés (génération de cours, adaptation de leçon, correction IA, bulletins, classe) — ce n'est pas propre à un profil ou un module particulier.

## User Stories

1. En tant qu'enseignant, je veux qu'un clic sur un bouton ou un lien de navigation produise une réaction visible en moins de 200ms, afin de ne jamais avoir l'impression que l'application n'a pas reçu mon action.
2. En tant qu'enseignant, je veux qu'une navigation complète entre deux pages s'affiche en moins d'une seconde dans la grande majorité des cas, afin de garder le fil de ce que je suis en train de faire.
3. En tant qu'enseignant, je veux voir un signal de chargement clair dès qu'une action dépasse une seconde, afin de savoir que le système travaille plutôt que de croire qu'il est bloqué.
4. En tant qu'enseignant, je veux que sélectionner une classe dans un formulaire (bulletin, correction) affiche la liste des élèves sans latence perceptible, afin de ne pas interrompre ma saisie.
5. En tant qu'enseignant déjà connecté avec un profil complet, je veux que l'application n'ait pas besoin de re-vérifier mon profil à chaque page visitée, afin que ma navigation reste fluide tout au long de ma session.

## Critères de succès

- Une interaction simple (changer d'onglet, ouvrir une liste, sélectionner une option) réagit visuellement en moins de 200ms.
- Une navigation complète entre deux pages de l'application s'affiche en moins d'une seconde dans la grande majorité des cas.
- Toute action dépassant une seconde affiche un indicateur de chargement visible, sans exception.
- Sélectionner une classe dans un formulaire fait apparaître la liste des élèves sans délai perceptible.

## Hors périmètre

- La lenteur de compilation à la demande du serveur de développement (`next dev`) — comportement normal, disparaît en production.
- Refonte de l'architecture serveur ou changement d'hébergement.
- Mise en cache de pages affichant des données sensibles au moment présent (quota restant, génération en cours).
- Le temps de traitement des générations IA elles-mêmes — seul le délai avant qu'une action démarre est concerné.

## Décisions d'implémentation

- Le statut « profil enseignant complété » n'est revérifié qu'une fois par connexion, pas à chaque navigation — une fois validé, il reste considéré comme à jour jusqu'à la prochaine connexion de l'enseignant.
- Les pages qui n'affichent pas de données changeant à chaque visite (contenu déjà généré, listes stables) peuvent être servies depuis un cache plutôt que régénérées intégralement à chaque visite.
- Toute action de plus d'une seconde affiche un indicateur de chargement (spinner, barre de progression ou état désactivé du bouton), cohérent avec le système déjà en place ailleurs dans l'app.

## Notes complémentaires

- Hypothèse : la lenteur ressentie provient majoritairement d'un mécanisme transverse (vérification systématique du profil à chaque navigation), pas d'un problème propre à une page ou une fonctionnalité — corriger ce point devrait améliorer la réactivité de tout le produit d'un coup.
- Risque : mal calibrer la fréquence de revérification du profil pourrait laisser un enseignant accéder à des pages avant d'avoir complété son profil dans de rares cas limites (ex. deux onglets ouverts simultanément) — à surveiller mais accepté comme compromis raisonnable.
