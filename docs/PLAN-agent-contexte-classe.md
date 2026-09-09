# Plan : Contexte de classe pour l'agent conversationnel

> PRD source : `docs/PRD-agent-contexte-classe.md`

## Décisions architecturales

- **Routes** : aucune nouvelle route — tout passe par le endpoint conversationnel existant de l'agent (`src/app/api/agent/chat/route.ts`), dans le même filet de sécurité qui détecte déjà la mention d'un élève.
- **Schema** : aucune nouvelle table. La moyenne de classe (Phase 2) est calculée à la volée depuis `evaluation_results`, pas de table de cache ni de colonne agrégée.
- **Modèles clés** : un `ClassContext` (symétrique à `StudentContext`) — projection condensée des données de classe destinée au prompt de l'agent, distincte de `ClassDashboardData` (déjà existante, orientée affichage du tableau de bord). `ClassContext` réutilise les mêmes données sources que `ClassDashboardData` (effectif, présences, retards, participation, observations, élèves à surveiller) sans dupliquer la logique de calcul.
- **Détection** : `detectMentionedClass`, symétrique à `detectMentionedStudent` (même forme de résultat : correspondance / ambiguïté / aucune mention), avec un cas propre aux classes — un enseignant qui n'a qu'une seule classe la voit automatiquement sélectionnée dès qu'une question porte sur « la classe », sans avoir besoin de la nommer.
- **Garde-fou confidentialité** : révision de la consigne du prompt système qui bloque aujourd'hui toute question impliquant plusieurs élèves — distinction entre agrégats de classe (autorisés, y compris quand la réponse nomme individuellement des élèves dans une liste) et comparaison nominative explicite entre deux élèves précis (toujours refusée). Changement transverse au prompt, livré dès la Phase 1.
- **Notes non numériques** : une moyenne de classe n'est calculée que si les notes de l'évaluation concernée suivent un format numérique reconnu (pourcentage, /20, /10, cohérent avec le système de notation du profil enseignant) ; sinon l'agent indique explicitement qu'aucune moyenne n'est calculable plutôt que d'inventer un chiffre — cohérent avec la règle anti-hallucination déjà en place dans le prompt.

---

## Phase 1 : Contexte de classe (hors moyennes)

**User stories** : US-1, US-2, US-4, US-5, US-6, US-7, US-8, US-9, US-10

### Ce qu'on livre

L'agent détecte quand une question porte sur une classe (nommée explicitement, ou automatiquement si l'enseignant n'en a qu'une seule), demande de préciser laquelle si l'enseignant en a plusieurs et que le message est ambigu, et répond aux questions sur l'effectif, le taux de présence, les retards, la participation, les observations récentes, et les élèves à surveiller ou ayant un plan d'intervention — en s'appuyant sur les données déjà agrégées pour le tableau de bord classe. Une classe sans aucune donnée enregistrée reçoit une réponse explicite plutôt qu'une réponse inventée. La comparaison nominative explicite entre deux élèves précis reste bloquée et redirigée, comme aujourd'hui. Un élève et sa classe peuvent être mentionnés dans le même échange conversationnel sans que l'un écrase le contexte de l'autre.

### Critères d'acceptation

- [ ] Une question sur l'effectif, les présences, les retards ou la participation d'une classe nommée reçoit une réponse fondée sur les vraies données de cette classe.
- [ ] Une question sur les élèves à surveiller ou ayant un plan d'intervention liste des élèves réellement signalés dans la classe.
- [ ] Un enseignant avec une seule classe reçoit une réponse directe sans qu'il ait à la nommer ; un enseignant avec plusieurs classes et un message ambigu reçoit une demande de clarification listant ses classes.
- [ ] Une demande de comparaison nominative entre deux élèves précis continue de rediriger vers une question sur un seul élève à la fois ; une question agrégée sur toute la classe est traitée normalement.
- [ ] Une classe sans aucune séance, présence ou observation enregistrée reçoit une réponse indiquant l'absence de données, jamais une réponse inventée.
- [ ] Une classe et un élève de cette classe mentionnés dans le même échange sont tous deux pris en compte correctement.

## Bloquée par

Aucune — démarrable immédiatement.

---

## Phase 2 : Moyennes de classe sur les évaluations

**User stories** : US-3

### Ce qu'on livre

L'agent répond à une question sur la moyenne d'une évaluation de la classe, en agrégeant les notes numériques réellement enregistrées pour cette évaluation. Si les notes de l'évaluation concernée ne sont pas dans un format numérique exploitable, ou qu'aucune note n'est enregistrée, l'agent le signale explicitement plutôt que d'inventer un chiffre.

### Critères d'acceptation

- [ ] Une question sur la moyenne d'une évaluation de la classe reçoit une réponse fondée sur les vraies notes enregistrées, cohérente avec un calcul manuel des mêmes notes.
- [ ] Une évaluation dont les notes sont en format non numérique (lettres, texte libre) déclenche une réponse indiquant qu'aucune moyenne n'est calculable, jamais un chiffre inventé.
- [ ] Une évaluation sans aucune note enregistrée déclenche une réponse indiquant l'absence de données.

## Bloquée par

- Phase 1
