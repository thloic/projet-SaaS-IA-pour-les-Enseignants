# Plan technique — Historique des documents générés et modification conversationnelle

> Sources : `docs/PRD-historique-documents.md`.
> Destiné à l'agent qui implémente. Suivre l'ordre des étapes. Réutiliser au maximum les pipelines PAT/bulletin déjà en place (grounding, garde-fous, cartes de relecture) plutôt qu'en recréer des parallèles.

## Étape 0 — Vérifications avant de commencer

- `ls supabase/migrations/ | sort -V | tail` pour le prochain numéro (au moment de ce plan, `027_teacher_profile_onboarding_tour.sql` était le dernier, sur un chantier concurrent — re-vérifier).
- Relire l'état courant de `patOrchestration.ts`, `bulletinOrchestration.ts`, `agentSchema.ts`, `agentResponses.ts`, `route.ts` (`/api/agent/chat`) — plusieurs chantiers concurrents les modifient activement, ne pas repartir d'une version périmée.
- `src/app/(dashboard)/bulletin/page.tsx` + `BulletinGenerator.tsx` : le formulaire de génération classique et la liste des bulletins passés sont aujourd'hui dans le **même composant**. Ce lot ne touche PAS au formulaire de génération — seule la portion "liste" doit être extraite vers la nouvelle page d'historique.
- Ne pas modifier `bulletin_comments` (schéma existant stable, utilisé par le formulaire classique) — la persistance du PAT vit dans une nouvelle table séparée.

---

## Étape 1 — Persistance du PAT

Migration `supabase/migrations/0XX_pat_generations.sql` :

```sql
create table if not exists public.pat_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  language text not null default 'fr',
  pat jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists pat_generations_student_id_idx on public.pat_generations(student_id);

alter table public.pat_generations enable row level security;

create policy "pat_generations_select_own" on public.pat_generations
  for select using (auth.uid() = user_id);
create policy "pat_generations_insert_own" on public.pat_generations
  for insert with check (auth.uid() = user_id);
```

Pas d'`update`/`delete` policy : conforme à la décision "jamais d'écrasement, jamais de suppression en V1" du PRD (insert-only).

- `patOrchestration.ts` : après une génération réussie (`kind: 'pat'` retourné), insérer une ligne dans `pat_generations` via une nouvelle dépendance `savePAT(record)` — même pattern que `saveBulletinComment` déjà injecté dans `bulletinOrchestration.ts`. Le `classId` sauvegardé est celui du modèle sélectionné (`selectedTemplate.classId`), déjà disponible dans le flux.

---

## Étape 2 — Intention de modification (commune PAT + bulletin)

- `src/features/agent/server/documentModificationIntent.ts` : filtre mots-clés léger (fr/en/es : "modifie", "corrige", "change", "update", "edit", "modify", "corrige"), même esprit que `bulletinIntent.ts`.
- `src/features/agent/schemas/documentModificationSchema.ts` : schéma d'extraction IA — `{ studentQuery: string|null, documentType: 'pat'|'bulletin'|null, instruction: string|null }`. Résolution : exige les trois (comme le bulletin exige élève+matière+note) ; si `documentType` n'est pas déterminable depuis le message, extraction incomplète → retombe sur le chat normal (même repli que le bulletin).
- `src/features/agent/server/documentModificationExtractionModel.ts` : appel IA structuré, même forme que `bulletinExtractionModel.ts`.

---

## Étape 3 — Orchestration de la modification

Nouveau fichier `src/features/agent/server/documentModificationOrchestration.ts` :

- Dépendances injectées : `extractModificationFields`, `getStudentContext` (réutilisé), `findLatestDocument(userId, studentId, documentType)` (nouvelle requête : `pat_generations` ou `bulletin_comments` selon le type, triée par `created_at desc`, `limit(1)`), `regeneratePAT` / `regenerateBulletinComment` (nouvelles fonctions, voir Étape 4), `saveDocument`, `checkUsage`, `refundUsage`.
- Flux : extraction → résolution élève (réutilise `buildStudentNotFoundResponse`/`buildClarificationResponse` de `agentResponses.ts`, ne pas dupliquer) → recherche du document le plus récent du type demandé → si absent, nouvelle réponse `document_not_found_for_modification` (nouveau kind dans `agentSchema.ts`, nouveau builder dans `agentResponses.ts`, même style que `buildTemplateMissingResponse`) → si présent, `checkUsage` puis régénération avec garde-fous inchangés → sauvegarde comme nouvelle entrée (jamais d'update) → retour `kind: 'pat'` ou `kind: 'bulletin'` (les cartes de relecture existantes s'affichent sans modification, aucune nouvelle UI de relecture à construire).
- Brancher dans `route.ts` : après les blocs PAT/bulletin existants, avant le chat normal — même position que le bloc bulletin actuel.

---

## Étape 4 — Régénération avec document existant

- `patPrompt.ts` : ajouter un paramètre optionnel `previousPat?: PAT` + `modificationInstruction?: string` à `buildPATPrompt`. Si présents, insérer une section "DOCUMENT PRÉCÉDENT : {JSON} / INSTRUCTION DE MODIFICATION : {texte}" avant le contexte élève, avec une consigne explicite : appliquer uniquement cette modification, conserver le reste, respecter strictement le même schéma. `groundGeneratedPAT` s'applique ensuite exactement comme pour une génération initiale — ne pas le contourner.
- `bulletin.ts` (prompts) : même ajout, `previousComment?: {strengths, nextStep}` + `modificationInstruction?: string`. `parseAndValidateBulletinDraft` s'applique sans changement.
- Aucune nouvelle logique de validation à écrire : la modification traverse les mêmes fonctions que la génération (`parseAndValidatePAT`, `parseAndValidateBulletinDraft`), c'est le contenu du prompt qui change, pas le pipeline de validation.

---

## Étape 5 — Historique unifié : correction de trajectoire

> **Correction post-vérification** : `/documents` existe déjà et sert à tout autre chose (documents source du module Adapt Lessons — sans rapport). Ne pas créer de route à ce nom. Plus important : une page d'agrégation d'activité existe **déjà** — `/history` (`src/app/(dashboard)/history/page.tsx`, alimentée par `loadCentralDashboard` dans `src/features/dashboard/server/dashboardData.ts`), qui agrège déjà `courses`, `quizzes`, `bulletin_comments`, `adaptation_sets`, `correction_batches`. Construire une nouvelle page séparée dupliquerait ce que celle-ci fait déjà pour les autres modules.

- **Ne pas créer de nouvelle route.** Étendre `loadCentralDashboard` pour inclure `pat_generations` comme source supplémentaire, au même titre que les autres (même requête `.eq('user_id', ...)`, même normalisation vers la forme d'affichage déjà utilisée par `HistoryPageContent`).
- Relire `HistoryPageContent` (`src/features/dashboard/history/HistoryPageContent.tsx`) et la forme de donnée déjà normalisée par `loadCentralDashboard` avant d'ajouter le PAT — s'aligner sur ce format existant plutôt que d'en inventer un nouveau.
- Action par entrée PAT dans cette liste : bouton d'export DOCX (réutilise `/api/agent/pat/export` existant, le PAT est déjà en jsonb).
- Filtres déjà existants sur `/history` (si présents) : vérifier s'ils couvrent déjà élève/type ou s'il faut les étendre légèrement pour le PAT.
- La liste des bulletins déjà affichée dans `BulletinGenerator.tsx` peut soit rester (vue filtrée pratique depuis le formulaire), soit être remplacée par un lien vers `/history` — à trancher au moment de coder selon ce qui paraît le moins redondant une fois `/history` étendu ; le formulaire de génération classique sur `/bulletin`, lui, reste inchangé dans tous les cas.

---

## Étape 6 — Tests

- `tests/unit/document-modification.test.ts` (nouveau, miroir de `bulletin-agent.test.ts`) :
  - Extraction incomplète → `null`, aucun appel.
  - Élève sans document du type demandé → `document_not_found_for_modification`, aucun appel de génération/quota.
  - Élève avec plusieurs documents du même type → le plus récent est utilisé.
  - Modification réussie → nouvelle entrée sauvegardée (pas de mise à jour de l'ancienne), quota débité une fois.
  - Échec de régénération → remboursement exactement une fois (même pattern que les orchestrations existantes).
- Étendre `tests/unit/pat-generation.test.ts` : `buildPATPrompt` avec `previousPat`/`modificationInstruction` inclut bien ces éléments dans le prompt.
- `npx tsc --noEmit`, `npm run test:unit`, `npm run test:integration`, `npx eslint` avant de considérer le lot terminé.

---

## Hors périmètre (rappel)

- Modification champ par champ.
- Choix manuel d'une version précise parmi plusieurs.
- Suppression d'un document.
- Export DOCX du bulletin.
- Toute modification du schéma ou du comportement de `bulletin_comments` / du formulaire `/bulletin` classique.
