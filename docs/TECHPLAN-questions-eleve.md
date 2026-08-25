# Plan technique — Questions libres sur un élève

> Sources : `docs/PRD-questions-eleve.md`.
> Destiné à l'agent qui implémente. Réutilise entièrement la résolution d'élève et les garde-fous déjà en place (PAT/bulletin) — aucun nouveau mécanisme de sécurité à inventer, seulement la détection et l'injection de contexte.

## Étape 0 — Vérifications

- Relire l'état courant de `route.ts` (`/api/agent/chat`), `buildAgentSystemPrompt` (`src/lib/prompts/agent.ts`), `memory.ts`/`getStudentContext` — plusieurs chantiers concurrents les modifient.
- Confirmer l'ordre des détections déjà en place dans `route.ts` : PAT → bulletin → modification → (nouveau : question élève) → chat général. Ce lot s'insère en dernière position avant le fallback général, jamais avant les trois autres.

---

## Étape 1 — Détection par nom (pas par mots-clés)

Nouveau fichier `src/features/agent/server/studentMentionDetection.ts` :

- `detectMentionedStudent(message: string, ownedStudents: OwnedStudentRecord[]): OwnedStudentRecord | 'ambiguous' | null` — réutilise la même logique de normalisation que `resolveStudent` dans `studentContextCore.ts` (accents, casse, correspondance partielle) plutôt que d'en écrire une nouvelle.
- Si le message contient plusieurs noms d'élèves différents et reconnus : ne retenir que le **premier trouvé dans l'ordre du texte**, pas de fusion. Le prompt système (Étape 3) doit explicitement inviter l'agent à proposer de traiter les élèves un par un si l'enseignant en mentionne plusieurs.
- `ownedStudents` provient d'un appel léger — vérifier si une fonction équivalente à `listOwnedStudents` (déjà dans `StudentContextRepository`) est exposable sans repasser par toute la résolution complète, pour éviter une requête redondante avant même de savoir si un nom est mentionné.

---

## Étape 2 — Branchement dans la route

Dans `route.ts`, après les blocs PAT / bulletin / modification existants, avant le fallback `streamText` :

- Charger la liste des élèves du professeur (une seule fois, réutilisable).
- Appliquer `detectMentionedStudent` sur le dernier message utilisateur.
- Si `'ambiguous'` → retourner la même réponse structurée `clarification` déjà utilisée par le PAT (réutiliser `buildClarificationResponse` de `agentResponses.ts`), **avant** d'entrer dans le flux de streaming.
- Si un élève unique est trouvé → appeler `getStudentContext` pour cet élève, puis continuer vers le `streamText` existant, avec le contexte injecté dans le prompt système (Étape 3) au lieu du prompt générique actuel.
- Si rien n'est trouvé → comportement strictement inchangé (le prompt générique actuel, sans contexte élève).
- Quota : aucun changement — ce chemin traverse le même `checkAndIncrementUsage` que le chat général aujourd'hui.

---

## Étape 3 — Prompt système détaillé et évolutif

Le développeur veut un prompt volontairement très détaillé au départ, affiné ensuite avec les retours réels du client (enseignant). Structurer pour que chaque partie soit éditable isolément, pas un seul bloc de texte monolithique.

Découper `src/lib/prompts/agent.ts` en sections composables explicites (fonctions ou constantes nommées, assemblées à la fin) :

1. **Rôle** — ce qu'est l'agent, pour qui, dans quel produit (existe déjà, à garder).
2. **Contexte enseignant** — matière/niveau/pays (existe déjà).
3. **Contexte élève** *(nouveau, uniquement injecté quand un élève est détecté)* — une nouvelle fonction dédiée, ex. `buildStudentContextSection(context: StudentContext)`, qui décrit explicitement à l'agent :
   - l'identité de l'élève et ses classes,
   - ses résultats d'évaluation récents (matière, note, date, titre),
   - ses observations récentes (catégorie, tag, note, date),
   - ses présences récentes,
   - une consigne explicite : *« Base ta réponse uniquement sur les informations ci-dessus. Si l'information demandée n'y figure pas, dis-le clairement plutôt que d'inventer. »*
4. **Règles absolues** (bienveillance, anti-hallucination, confidentialité, un seul élève à la fois) — existent déjà pour la plupart, à compléter avec la règle multi-élèves de l'Étape 1.
5. **Ton** — existe déjà.
6. **Exemples de formulation attendue/à éviter** *(nouveau)* — 2-3 exemples courts, dans l'esprit de ce qui existe déjà pour le PAT et le bulletin (« PAS ... MAIS ... »), pour ancrer concrètement le style attendu par l'enseignant client. C'est la section que le développeur va le plus probablement vouloir réviser après les premiers retours — la garder courte et clairement isolée.

Objectif de cette découpe : quand le développeur reçoit un retour du client du type « l'agent devrait plutôt dire X », il doit pouvoir identifier en un coup d'œil quelle section modifier (probablement la 3 ou la 6) sans relire tout le prompt ni risquer de casser les règles de sécurité des sections 1, 2 et 4.

---

## Étape 4 — Tests

- `tests/unit/student-mention-detection.test.ts` : détection d'un nom exact, d'un nom partiel, d'un nom ambigu (plusieurs correspondances), d'aucun nom, de plusieurs noms différents dans un même message (seul le premier retenu).
- Étendre les tests de route existants si un pattern de test sur `route.ts` existe déjà (vérifier avant d'en créer un nouveau).
- `npx tsc --noEmit`, `npm run test:unit`, `npx eslint`.

---

## Hors périmètre

- Détection par IA du sujet de la question.
- Réponse couvrant plusieurs élèves à la fois.
- Nouvelle interface de relecture ou d'affichage — reste un message de chat standard.
