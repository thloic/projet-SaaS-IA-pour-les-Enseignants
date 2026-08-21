# PRD — Modèles de documents configurables (Agent IA)

## Problème

L'enseignant hors du contexte québécois standardisé (ex. Mexique) n'a pas de format institutionnel équivalent au PAT pour documenter les besoins/adaptations d'un élève ou produire un bulletin. L'agent IA génère aujourd'hui selon un format figé calqué sur le modèle québécois : pour ces enseignants, le résultat ne correspond à aucun document réellement utilisable dans leur établissement.

## Solution

L'enseignant configure, pour une classe, un modèle de document — un exemple ou une description du format qu'il utilise déjà dans son établissement. Ce modèle est obligatoire : tant qu'il n'est pas configuré, l'agent ne génère pas de document pour les élèves de cette classe et le signale clairement à l'enseignant. Une fois le modèle en place, l'enseignant demande à l'agent conversationnel de générer un document pour un élève de cette classe (ex. « crée un bulletin pour cet élève »), et l'agent s'en inspire pour produire un document dans ce format plutôt que de suivre une structure figée.

## Utilisateur cible

Enseignant hors du contexte québécois standardisé (ex. Mexique), ayant déjà configuré son profil et créé sa classe avec ses élèves, qui a un format de document propre à son école/programme mais aucun moyen actuel de le communiquer à l'agent.

## User Stories

1. En tant qu'enseignant, je veux configurer un modèle de document pour une classe, afin que l'agent génère des documents adaptés au format utilisé dans mon établissement plutôt qu'un format figé qui ne correspond pas à ma réalité.
2. En tant qu'enseignant, je veux ajouter ce modèle en collant ou en rédigeant un exemple du document que j'utilise déjà, afin de ne pas avoir à remplir un formulaire technique.
3. En tant qu'enseignant sans modèle configuré pour sa classe, je veux que l'agent me dise clairement qu'aucun modèle n'est configuré quand je lui demande un document, afin de savoir exactement quoi faire avant de pouvoir continuer.
4. En tant qu'enseignant, je veux modifier le modèle de ma classe à tout moment, afin de l'ajuster si le format institutionnel change.
5. En tant qu'enseignant, je veux voir clairement si un modèle est configuré pour la classe concernée, afin de savoir à quoi m'attendre avant de demander une génération.
6. En tant qu'enseignant, je veux demander à l'agent de créer un bulletin (ou un document de suivi) pour un élève, afin que le document généré s'inspire du modèle configuré pour la classe de cet élève.
7. En tant qu'enseignant utilisant déjà le PAT québécois, je veux que rien ne change dans mon flux actuel, afin de ne pas être perturbé par une option destinée à d'autres marchés.
8. En tant qu'enseignant, je veux pouvoir supprimer le modèle configuré pour une classe, afin de revenir au comportement par défaut si besoin.
9. En tant qu'enseignant, je veux que le document généré à partir d'un modèle reste une proposition à valider, comme tout autre document de l'agent, afin de garder le contrôle final même quand l'agent s'inspire de mon modèle.

## Critères de succès

- Un enseignant peut configurer un modèle pour une classe et le retrouver associé à cette classe dans l'interface, sans étape technique.
- Un document généré par l'agent pour une classe avec modèle configuré adopte visiblement la structure du modèle fourni, pas le format québécois figé.
- Une classe sans modèle configuré bloque toute demande de document à l'agent avec un message explicite, sans débiter le quota de génération.
- Le flux existant du PAT québécois continue de fonctionner sans changement observable pour les classes qui ont un modèle configuré.

## Hors périmètre

- Plusieurs modèles simultanés par classe selon le type de document (V1 : un seul modèle actif par classe, utilisé quel que soit le document demandé).
- Modification du formulaire de génération classique du bulletin — cette fonctionnalité concerne uniquement le canal conversationnel de l'agent.
- Bibliothèque de modèles partagée entre enseignants.
- Validation ou analyse automatique de la qualité du modèle fourni.
- Import de modèle depuis un fichier Word/PDF avec extraction automatique de structure (V1 : texte collé/saisi uniquement).
- Remplacement du pipeline PAT québécois existant — il coexiste, inchangé.

## Décisions d'implémentation

- Le modèle est un texte libre que l'enseignant colle ou rédige, dans un espace dédié à la configuration de la classe — pas de formulaire à champs structurés.
- Un seul modèle actif par classe à la fois ; le reconfigurer remplace le précédent.
- Absence de modèle = génération bloquée : l'agent répond que la classe concernée n'a pas de modèle configuré et invite l'enseignant à le faire avant de continuer.
- Le document généré à partir d'un modèle reste soumis à la même étape de relecture/validation que tout autre document généré par l'agent.
- Le canal d'accès à cette fonctionnalité est exclusivement l'agent conversationnel pour cette V1.

## Notes complémentaires

- Dépend du chantier Agent IA existant (détection d'intention, orchestration, génération) — cette fonctionnalité rend la configuration d'un modèle obligatoire avant toute génération de document par l'agent, pour toutes les classes, y compris celles qui utilisaient jusqu'ici le PAT québécois par défaut.
- Ordre de livraison convenu avec le développeur : le PAT est traité en premier (cette V1) ; la génération de bulletin via l'agent suivra dans un lot séparé, une fois le PAT via modèle validé.
- Risque : sans exemple réel de document mexicain fourni par le client, le format « texte libre » reste une hypothèse — à confirmer avec 1-2 exemples réels dès que possible.
- Hypothèse validée avec le développeur : la classe est le bon niveau de rattachement du modèle (pas l'enseignant, pas l'élève).
