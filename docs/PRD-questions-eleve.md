# PRD — Questions libres sur un élève

## Problème

Quand l'enseignant pose une question libre sur un élève précis (« comment va Loïc ce mois-ci ? », « quels sont ses points forts ? ») sans que ça corresponde à une demande de PAT, de bulletin ou de modification, l'agent répond sans aucune donnée réelle sur cet élève — au mieux une réponse générique, au pire une réponse inventée.

## Solution

Dès qu'un message mentionne le nom d'un élève réel de l'enseignant, l'agent charge son dossier (résultats, observations, présences) et s'en sert pour répondre — peu importe la formulation de la question, sans que l'enseignant ait à utiliser une commande précise.

## Utilisateur cible

Enseignant déjà utilisateur de l'agent, qui veut lui poser des questions de suivi courantes sur un élève sans passer par une génération formelle de document.

## User Stories

1. En tant qu'enseignant, je veux poser une question libre sur un élève et recevoir une réponse basée sur son vrai dossier, afin de ne pas avoir à chercher l'information moi-même.
2. En tant qu'enseignant, je veux que cette réponse suive les mêmes règles que les documents générés (jamais de négatif direct, jamais d'invention), afin de garder la même confiance.
3. En tant qu'enseignant qui mentionne un nom ambigu, je veux qu'on me demande de préciser lequel, comme pour une génération de PAT.
4. En tant qu'enseignant qui mentionne plusieurs élèves dans un même message, je veux que l'agent se concentre sur un seul à la fois plutôt que de mélanger leurs informations.
5. En tant qu'enseignant, je veux que cette question ne débite pas mon quota différemment d'une conversation normale.

## Critères de succès

- Une question mentionnant un élève réel produit une réponse contenant des éléments réels de son dossier.
- Un nom ambigu déclenche une clarification, jamais une réponse mélangeant deux élèves.
- Un message sans nom d'élève reconnu se comporte exactement comme avant (aucune régression du chat général).

## Hors périmètre

- Détection par IA du sujet de la question (on détecte par nom, pas par intention).
- Support de plusieurs élèves dans une même réponse.
- Nouvelle interface de relecture — reste un message de chat normal.

## Décisions d'implémentation

- Déclenchement uniquement si aucune des trois demandes déjà gérées (PAT, bulletin, modification) ne correspond.
- Un seul élève chargé par message, même si plusieurs noms sont mentionnés.
- Réutilisation intégrale des mécanismes existants de résolution d'élève et de garde-fous — aucun nouveau composant d'interface.

## Notes complémentaires

- Le prompt système qui exploite ce contexte doit rester volontairement détaillé et facile à faire évoluer : le développeur prévoit de l'affiner au fil des retours réels de l'enseignant client (voir plan technique pour la structure).
