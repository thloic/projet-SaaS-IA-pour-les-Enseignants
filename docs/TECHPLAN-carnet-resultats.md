# Plan technique — Carnet de résultats par classe

> Sources : `docs/PRD-carnet-resultats.md`, `docs/PLAN-carnet-resultats.md`.
> Destiné à l'agent qui implémente. Suivre l'ordre des étapes — chacune est vérifiable seule avant de passer à la suivante. Ne pas coder le fast-follow "dictée conversationnelle" (hors périmètre, voir PRD).

## Étape 0 — Vérifications avant de commencer

- `ls supabase/migrations/ | sort -V | tail` pour confirmer le prochain numéro de migration (dernier connu : `025_class_sessions_timezone_and_open_guard.sql` → utiliser `026`, mais re-vérifier, des sessions concurrentes peuvent en ajouter).
- Relire l'état actuel de `src/features/agent/server/studentContextCore.ts`, `memory.ts`, `memory.types.ts`, `bulletinOrchestration.ts`, `agentSchema.ts`, `agentResponses.ts` avant d'éditer (ce sont des fichiers déjà bien remplis par ce chantier, ne pas repartir d'une version périmée).
- Routes de classe existantes à connaître : `/classroom/[classId]` (détail), `/classroom/[classId]/session`, `/classroom/[classId]/students` — la nouvelle UI doit suivre ce même pattern.

---

## Étape 1 — Migration

Fichier `supabase/migrations/026_evaluation_results.sql` :

```sql
create table if not exists public.evaluation_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  title text,
  grade text not null,
  created_at timestamptz not null default now()
);

create index if not exists evaluation_results_class_id_idx on public.evaluation_results(class_id);
create index if not exists evaluation_results_student_id_idx on public.evaluation_results(student_id);

alter table public.evaluation_results enable row level security;

create policy "evaluation_results_select_own" on public.evaluation_results
  for select using (auth.uid() = user_id);
create policy "evaluation_results_insert_own" on public.evaluation_results
  for insert with check (auth.uid() = user_id);
create policy "evaluation_results_update_own" on public.evaluation_results
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "evaluation_results_delete_own" on public.evaluation_results
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
```

Pas de colonne `subject` : la matière est celle de `classes.subject` via `class_id`, ne pas dupliquer.

---

## Étape 2 — Types et schéma

- `src/features/classroom/types/classroom.types.ts` : ajouter
  ```ts
  export interface EvaluationResult {
    id: string
    user_id: string
    class_id: string
    student_id: string
    title: string | null
    grade: string
    created_at: string
  }
  ```
- `src/features/classroom/schemas/classroomSchema.ts` : ajouter
  ```ts
  export const evaluationResultEntrySchema = z.object({
    studentId: z.string().uuid(),
    grade: z.string().trim().min(1).max(50),
  })

  export const evaluationResultBatchSchema = z.object({
    classId: z.string().uuid(),
    title: z.string().trim().max(120).optional(),
    results: z.array(evaluationResultEntrySchema).min(1),
  })

  export const evaluationResultUpdateSchema = z.object({
    title: z.string().trim().max(120).optional(),
    grade: z.string().trim().min(1).max(50),
  })
  ```
  Filtrer côté client les lignes sans note avant l'envoi (grille) — le schéma ne les accepte pas vides, donc c'est aussi une garde serveur naturelle.

---

## Étape 3 — Actions serveur

Nouveau fichier `src/features/classroom/server/evaluationResults.actions.ts` (`'use server'`), en suivant le pattern déjà établi de `classroom.actions.ts` (vérification `getCurrentUser`, `.eq('user_id', ...)` systématique) :

- `saveEvaluationResultsBatchAction(input: { classId, title?, results: {studentId, grade}[] })` : valide via `evaluationResultBatchSchema`, vérifie que `classId` appartient à l'utilisateur, insère toutes les lignes en un seul `insert` (tableau), `revalidatePath` sur la page classe et la nouvelle page évaluations.
- `saveEvaluationResultAction(classId, studentId, title?, grade)` : insertion individuelle, même vérifications.
- `updateEvaluationResultAction(resultId, input)` : `update` filtré par `.eq('id', resultId).eq('user_id', user.id)`.
- `deleteEvaluationResultAction(resultId)` : `delete` filtré pareillement.
- `listClassEvaluationResults(classId)` : `select('*, student_profiles(first_name, last_name)')` filtré par `class_id` + `user_id`, trié par `created_at desc` — sert à afficher l'historique et pré-remplir la grille si besoin.

Vérification d'appartenance élève↔classe : réutiliser le pattern déjà présent (`class_students`) comme dans `verifySessionStudent`/`listClassStudents`, ne pas en inventer un nouveau.

---

## Étape 4 — Interface

Nouvelle route `src/app/(dashboard)/classroom/[classId]/evaluations/page.tsx`, dans l'esprit de `.../session/page.tsx` et `.../students/page.tsx` déjà en place.

Composant `src/features/classroom/components/EvaluationResultsGrid.tsx` :
- Charge la liste des élèves de la classe (réutiliser `listClassStudents`) + l'historique (`listClassEvaluationResults`).
- Un champ "titre" partagé en haut (optionnel), une ligne par élève avec un champ note (texte libre, placeholder selon le système de notation du profil si facilement accessible, sinon générique).
- Bouton "Enregistrer" → `saveEvaluationResultsBatchAction`, ignore les lignes vides côté client avant l'envoi.
- En dessous ou dans un onglet séparé : liste des résultats déjà saisis (élève, titre, note, date), avec édition inline et suppression (`updateEvaluationResultAction` / `deleteEvaluationResultAction`).
- Lien d'accès depuis `ClassDetail.tsx` (carte/bouton vers `/classroom/[classId]/evaluations`, même style que le lien existant vers `/session`).

---

## Étape 5 — Circulation dans `getStudentContext`

- `src/features/agent/types/memory.types.ts` : ajouter
  ```ts
  export interface StudentEvaluationResultContext {
    id: string
    classId: string
    title: string | null
    grade: string
    createdAt: string
  }
  ```
  puis `evaluationResults: StudentEvaluationResultContext[]` sur `StudentContext`.

- `src/features/agent/server/studentContextCore.ts` :
  - Ajouter `RECENT_EVALUATION_RESULT_LIMIT = 25` (même borne que les autres listes).
  - Étendre `StudentContextRepository` avec `listRecentEvaluationResults(userId, studentId, limit): Promise<StudentEvaluationResultContext[]>`.
  - Dans `getStudentContextCore`, ajouter cet appel au `Promise.all` déjà présent (aux côtés de observations/participations/attendance/contentVariants) et l'inclure tel quel dans le `context` retourné — ne PAS le fusionner dans `keepMostRecentActivity` (c'est un concept distinct, pas à mélanger avec observations/participations/attendance).

- `src/features/agent/server/memory.ts` : implémenter `listRecentEvaluationResults` dans `createRepository()` — `select('*').eq('user_id', userId).eq('student_id', studentId).order('created_at', {ascending: false}).limit(limit)`, mapper vers `StudentEvaluationResultContext`.

---

## Étape 6 — Garde-fou et grounding dans le bulletin

- `src/features/agent/schemas/agentSchema.ts` : ajouter un membre à l'union discriminée :
  ```ts
  z.object({ kind: z.literal('student_data_missing'), message: z.string().min(1) }).strict(),
  ```
- `src/features/agent/server/agentResponses.ts` : ajouter `buildStudentDataMissingResponse(studentFullName, interfaceLanguage)`, fr/en/es, même style que `buildTemplateMissingResponse`.
- `src/features/agent/server/bulletinOrchestration.ts` :
  - Après la résolution de `selectedTemplate` (gate existant, inchangé) et après confirmation qu'il existe, filtrer `context.evaluationResults` sur `classId === selectedTemplate.classId`.
  - Si ce filtre est vide ET `context.observations` est vide → retourner `buildStudentDataMissingResponse(...)`, **avant** l'appel à `checkUsage` (aucun débit de quota, même logique que le gate de modèle).
  - Sinon, transmettre les résultats filtrés + les observations à `dependencies.generateBulletinComment` (étendre son type d'entrée avec `evaluationResults` et `observations`).
- `src/lib/prompts/bulletin.ts` : ajouter une section listant les résultats et observations récents dans le prompt (même esprit que `observationsRecentes`/`participationsRecentes` déjà présents dans `patPrompt.ts`), pour que l'IA les utilise dans la rédaction.

Portée explicite : **seul le bulletin est concerné par ce garde-fou et ce grounding dans ce lot.** Ne pas toucher au PAT (`patOrchestration.ts`, `patPrompt.ts`) — hors périmètre de ce PRD.

---

## Étape 7 — Tests

- Nouveau/étendu `tests/unit/student-context.test.ts` : vérifier que `evaluationResults` apparaît dans le contexte retourné, borné, isolé par enseignant (même style que les tests observations existants).
- Étendre `tests/unit/bulletin-agent.test.ts` :
  - Élève sans résultat ET sans observation → `kind: 'student_data_missing'`, aucun appel génération/quota.
  - Élève avec résultat seul (aucune observation) → génération normale.
  - Élève avec observation seule (aucun résultat) → génération normale.
  - Résultat existant mais lié à une AUTRE classe que celle de la demande → ne compte pas, doit quand même bloquer si aucune observation.
- Schéma zod (`evaluationResultBatchSchema` etc.) : tests de validation purs si un fichier `tests/unit/classroom-schema.test.ts` existe déjà, sinon ne pas en créer un nouveau juste pour ça — vérifier d'abord.
- `npx tsc --noEmit`, `npm run test:unit`, `npm run test:integration`, `npx eslint` sur les fichiers touchés avant de considérer le lot terminé.

---

## Hors périmètre (rappel, ne pas déborder)

- Moyenne/pondération/note finale calculée.
- Lien avec Correction IA.
- Export externe.
- Dictée conversationnelle des résultats (fast-follow séparé).
- Toute modification du PAT ou de son prompt.
