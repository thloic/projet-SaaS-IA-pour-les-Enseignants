# Plan technique — Prochaines étapes (à donner à l'agent codeur)

> Document unique consolidant tout ce qui reste à construire, vérifié à jour au moment de sa rédaction. Sources détaillées : `docs/PRD-historique-documents.md`, `docs/PRD-questions-eleve.md`, `docs/PRD-carnet-resultats.md`. Vérifier l'état réel du code avant de commencer (des sessions concurrentes peuvent avoir avancé depuis) — ne pas recoder ce qui est déjà fait.

## Déjà construit — ne pas refaire

- Modèle de document par classe (texte + PDF), génération de PAT et de bulletin via l'agent, garde-fous (modèle obligatoire, au moins un résultat ou une observation).
- Carnet de résultats par classe : saisie groupée en grille + saisie individuelle + édition + suppression (`evaluationResults.actions.ts`, `EvaluationResultsGrid.tsx`, migration `026`).
- Tutoriel d'onboarding (`OnboardingTour.tsx`, migration `027`).
- Persistance du PAT (`pat_generations`, migration `028`) et modification conversationnelle d'un document déjà généré (PAT et bulletin) : `documentModificationOrchestration.ts`, `documentModificationIntent.ts`, `documentModificationExtractionModel.ts`, `documentModificationSchema.ts`.

---

## 1 — Faire apparaître le PAT dans la page Historique existante

`/history` (`src/app/(dashboard)/history/page.tsx`, alimentée par `loadCentralDashboard` dans `src/features/dashboard/server/dashboardData.ts`) agrège déjà `courses`, `quizzes`, `bulletin_comments`, `adaptation_sets`, `correction_batches` — mais pas encore `pat_generations` (vérifié : aucune référence trouvée dans `dashboardData.ts`).

- Ajouter une requête sur `pat_generations` dans `loadCentralDashboard`, normalisée vers la même forme d'affichage que les autres sources déjà agrégées (relire `HistoryPageContent.tsx` pour la forme exacte attendue avant d'ajouter).
- Sur chaque entrée PAT de la liste : bouton d'export DOCX (réutilise `/api/agent/pat/export` existant).
- Ne pas créer de nouvelle route — `/documents` est déjà pris par un autre module (documents source, Adapt Lessons), sans rapport.

---

## 2 — Questions libres sur un élève

Aujourd'hui, une question qui ne correspond à aucune des demandes déjà gérées (PAT, bulletin, modification) tombe dans le chat général, qui n'a accès à aucune donnée réelle sur un élève précis — risque de réponse générique ou inventée.

- `src/features/agent/server/studentMentionDetection.ts` : détecte si le dernier message mentionne le nom d'un élève réel de l'enseignant (même normalisation que la résolution d'élève déjà utilisée ailleurs — ne pas la réécrire). Si plusieurs élèves différents sont mentionnés, ne retenir que le premier.
- Brancher dans `route.ts`, en dernière position, après les blocs PAT / bulletin / modification et avant le `streamText` général :
  - Élève ambigu → réponse `clarification` (réutiliser `buildClarificationResponse`).
  - Élève unique trouvé → charger son `getStudentContext`, l'injecter dans le prompt système pour ce tour, continuer en streaming normal (pas de nouvelle carte de relecture, c'est une réponse de chat classique).
  - Rien trouvé → comportement actuel inchangé.
- Aucun changement de quota : ce chemin passe par le même `checkAndIncrementUsage` que le chat général aujourd'hui.
- Prompt système (`src/lib/prompts/agent.ts`) : ajouter une section dédiée et isolée, injectée seulement quand un élève est détecté — identité, résultats récents, observations récentes, présences récentes, avec la consigne explicite de ne répondre qu'à partir de ces données et de le dire clairement si l'information demandée n'y figure pas. Garder cette section clairement séparée du reste du prompt (rôle, règles, ton) : c'est celle que le développeur va le plus probablement affiner avec les retours réels de l'enseignant client, donc elle doit être modifiable seule sans toucher aux règles de sécurité.
- Tests : `tests/unit/student-mention-detection.test.ts` — nom exact, partiel, ambigu, absent, plusieurs noms dans un message.

---

## 3 — Import CSV des résultats d'évaluation

Constat du développeur : la saisie manuelle note par note est fastidieuse quand l'enseignant a déjà ses notes dans un tableur — il doit pouvoir soit importer un fichier, soit continuer à saisir élève par élève (les deux restent disponibles, l'un n'exclut pas l'autre).

**Décision actée : CSV uniquement.** Pas d'Excel (nouvelle dépendance à valider séparément avant d'être ajoutée), pas de PDF (extraction de tableau non fiable pour créer des lignes en base de données).

- Bouton "Télécharger le modèle CSV" sur la page des résultats de la classe : génère un CSV à partir du roster réel (`Nom complet,Note`, note vide à remplir).
- Import : champ fichier `.csv` + champ "Titre" optionnel partagé (comme la saisie groupée existante). Nouvelle action serveur qui :
  1. Vérifie l'en-tête exact (`Nom complet,Note`), rejette sinon avec un message clair.
  2. Parse manuellement, sans nouvelle dépendance (découpage simple par ligne puis par virgule — le format imposé n'a pas besoin d'un parseur CSV complet).
  3. Associe chaque ligne à un élève du roster de cette classe par correspondance de nom (même normalisation que le reste du projet) ; ignore et rapporte les lignes sans correspondance unique ou sans note.
  4. Enregistre les lignes valides via la fonction déjà existante (`saveEvaluationResultsBatchAction`) — ne pas dupliquer la logique d'insertion.
  5. Retourne un résumé : nombre de lignes enregistrées + liste des lignes ignorées avec la raison.
- Tests : `tests/unit/evaluation-csv-import.test.ts` — en-tête invalide, nom introuvable, nom ambigu, note vide, import partiellement valide.

---

## Vérifications avant de considérer chaque lot terminé

- `npx tsc --noEmit`, `npm run test:unit`, `npm run test:integration`, `npx eslint` sur les fichiers touchés.
- `ls supabase/migrations/ | sort -V | tail` avant toute nouvelle migration (numérotation partagée avec d'autres sessions).
