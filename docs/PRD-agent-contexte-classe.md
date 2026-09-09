# PRD — Contexte de classe pour l'agent conversationnel

## Problème

L'enseignant discute avec l'agent conversationnel, mais dès qu'il pose une question sur sa classe dans son ensemble plutôt que sur un élève précis, l'agent ne peut pas répondre avec des données réelles — pire, il redirige activement la question vers un seul élève. L'enseignant qui veut un aperçu rapide de sa classe (qui est absent, qui a besoin d'attention, comment se porte le groupe) doit quitter la conversation pour aller consulter le tableau de bord séparément, ce qui casse le geste naturel de « je demande à mon assistant » qui fait la valeur du produit.

## Solution

L'enseignant peut poser à l'agent conversationnel n'importe quelle question sur une classe entière (effectif, présences, retards, participation, élèves à surveiller, plans d'intervention, moyennes de ses évaluations, observations récentes) et recevoir une réponse fondée sur les données réelles de cette classe, exactement comme il peut déjà le faire pour un élève précis.

## Utilisateur cible

Enseignant déjà utilisateur de l'agent conversationnel, avec au moins une classe créée et des élèves rattachés, qui veut un aperçu rapide de sa classe sans quitter la conversation pour aller chercher l'info dans le tableau de bord.

## User Stories

1. En tant qu'enseignant, je veux demander à l'agent des informations générales sur une de mes classes (effectif, taux de présence, retards, absences), afin d'avoir un aperçu rapide sans ouvrir le tableau de bord.
2. En tant qu'enseignant, je veux demander à l'agent quels élèves de ma classe ont besoin d'attention particulière (signaux, plan d'intervention, besoins), afin de préparer ma prochaine séance en connaissance de cause.
3. En tant qu'enseignant, je veux demander à l'agent la moyenne de ma classe sur une évaluation, afin de savoir rapidement comment le groupe a globalement performé.
4. En tant qu'enseignant, je veux demander à l'agent un résumé des observations récentes de ma classe, afin de repérer des tendances sans relire chaque fiche élève une par une.
5. En tant qu'enseignant qui a plusieurs classes et pose une question sans préciser laquelle, je veux que l'agent me demande de préciser, afin de ne pas recevoir une réponse sur la mauvaise classe.
6. En tant qu'enseignant qui n'a qu'une seule classe, je veux que l'agent comprenne de quelle classe je parle sans que j'aie à la nommer, afin de ne pas répéter une information évidente.
7. En tant qu'enseignant qui demande une comparaison nominative entre deux élèves précis (ex. « compare Marie et Julien »), je veux que l'agent continue de m'inviter à poser la question sur un seul élève à la fois, afin de préserver la confidentialité et l'équité entre élèves.
8. En tant qu'enseignant qui demande une information sur une classe sans encore aucune donnée enregistrée, je veux que l'agent me le dise clairement plutôt que d'inventer une réponse, afin de savoir que je dois d'abord alimenter la classe.
9. En tant qu'enseignant, je veux que l'agent réponde sur les informations les plus récentes de ma classe (dernier mois) par défaut quand je ne précise pas de période, afin d'avoir une réponse pertinente sans devoir préciser la période à chaque fois.
10. En tant qu'enseignant, je veux pouvoir enchaîner une question sur ma classe puis une question sur un élève précis de cette classe dans la même conversation, afin de ne pas perdre le fil de ma discussion avec l'agent.

## Critères de succès

- Une question sur l'effectif, les présences, les retards ou la participation d'une classe reçoit une réponse fondée sur les vraies données de cette classe, vérifiable en comparant avec le tableau de bord classe.
- Une question sur la moyenne d'une évaluation de la classe reçoit une réponse fondée sur les vrais résultats enregistrés.
- Une question sur les élèves à surveiller ou ayant un plan d'intervention liste des élèves réellement signalés dans la classe, pas une réponse générique.
- Une question sur une classe alors que l'enseignant en a plusieurs, sans précision, déclenche une demande de clarification listant ses classes plutôt qu'une réponse sur une classe au hasard.
- Une question sur une classe alors que l'enseignant n'en a qu'une seule reçoit directement une réponse, sans demande de clarification.
- Une demande de comparaison nominative entre deux élèves précis continue de rediriger vers une question sur un seul élève à la fois.
- Une question sur une classe sans aucune donnée enregistrée reçoit une réponse indiquant l'absence de données, jamais une réponse inventée.

## Hors périmètre

- Comparaison nominative directe entre deux ou plusieurs élèves précis dans une même réponse (comportement actuel inchangé).
- Comparaison entre plusieurs classes dans une même réponse.
- Choix d'une période personnalisée par l'enseignant (V1 : période fixe par défaut, pas de sélecteur).
- Génération de document (bulletin, PAT, message) à partir d'une question de niveau classe — ce flux concerne uniquement les réponses conversationnelles informatives.
- Alertes proactives envoyées sans que l'enseignant ait posé de question.
- Historique ou export de ces réponses en dehors de la conversation elle-même.

## Décisions d'implémentation

- Canal d'accès exclusivement la conversation existante avec l'agent — aucune nouvelle interface.
- Enseignant avec une seule classe : toute question de niveau classe s'applique automatiquement à celle-ci, sans qu'il ait besoin de la nommer.
- Enseignant avec plusieurs classes et message ambigu : l'agent liste ses classes et demande de préciser — même mécanique que la désambiguïsation déjà en place pour un prénom d'élève ambigu.
- Une classe et un élève de cette classe peuvent être mentionnés dans le même échange sans se contredire.
- Par défaut, les informations « récentes » (présences, observations, participation) couvrent les 30 derniers jours.
- Une comparaison nominative explicite entre élèves précis continue de déclencher le message actuel ; une question agrégée sur toute la classe est traitée normalement, y compris quand la réponse nomme individuellement des élèves dans une liste (ex. la liste des absents du jour).
- Une classe sans aucune séance, présence ou résultat enregistré reçoit une réponse explicite indiquant l'absence de données.

## Notes complémentaires

- S'appuie sur les données déjà agrégées pour le tableau de bord classe (effectif, présences, retards, participation, observations, élèves à surveiller) — ajoute un nouveau canal de consultation (conversationnel), ne recalcule rien différemment.
- Les moyennes de classe sur les évaluations nécessitent une agrégation qui n'existe pas encore au niveau classe (seulement au niveau élève) — à construire dans le cadre de cette fonctionnalité.
- Distinct de `PRD-agent-modeles.md` (modèles de documents par classe) : cette fonctionnalité concerne les réponses informatives de l'agent, pas la génération de documents.
