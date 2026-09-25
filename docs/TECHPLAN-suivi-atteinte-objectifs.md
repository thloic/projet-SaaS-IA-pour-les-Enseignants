# Plan technique — Suivi d'atteinte des objectifs du plan de suivi (SMART + bilan de révision)

> **Statut au 2026-09-25 : Phases A, B, C implémentées et testées (backend + branchement chat).** 30 tests unitaires verts (`follow-up-plan-tracking`, `follow-up-plan-status-service`, `follow-up-plan-review-intent`, `follow-up-plan-review-orchestration`, extension de `follow-up-plan-generation`), `tsc --noEmit` et `eslint` propres, aucune régression sur la suite existante (263 tests unitaires + 26 tests d'intégration). Reste à construire : les 3 boutons de statut par objectif dans l'UI (le service `followUpPlanTrackingActions.ts` est prêt à être appelé, mais rien ne l'appelle encore dans une page) — hors périmètre des tests unitaires, comme prévu ci-dessous.

> Découle de `docs/BACKLOG-fonctionnalites-restantes.md` (Tier 1). Étend le brouillon de plan de suivi déjà livré (`followUpPlan*.ts`, Phase 3 de `TECHPLAN-agent-ia-vision-client.md`) plutôt que de créer un flux parallèle.
>
> **Une fonctionnalité = une session.** Discipline TDD du projet : tests unitaires écrits et rouges avant tout code de production, puis code jusqu'à ce qu'ils passent (`CLAUDE.md` §4, `TECHPLAN-agent-ia-vision-client.md` normes transverses).

---

## Pourquoi le brouillon actuel ne suffit pas

`orchestrateFollowUpPlanRequest` (Phase 3, déjà livré) génère un brouillon et le retourne dans le fil de conversation — **rien n'est jamais persisté**. Le schéma `followUpPlanSchema` porte déjà un champ `statut: 'brouillon' | 'actif' | 'termine'`, mais seule la valeur `'brouillon'` est jamais produite (`groundFollowUpPlan` la fixe en dur). Sans persistance, impossible de savoir plus tard si un objectif a été atteint, ni de préparer un bilan de révision — exactement ce que demande le client (« suivi de l'atteinte des objectifs, préparation du bilan de révision »).

## Décisions architecturales

- **Persistance = même moment que la génération**, pas un clic « valider » séparé. Cohérent avec le PAT et le bulletin, qui sauvegardent automatiquement dès la génération réussie (`saveBulletinComment` dans `bulletinOrchestration.ts`) — la relecture humaine se fait dans le fil de conversation, pas via une porte de validation supplémentaire (décision déjà actée dans `PRD-agent-ia-vision-client.md` : « les mêmes actions de relecture, modification et validation que les documents déjà générés »).
- **Mise à jour du statut d'un objectif = action structurée, pas du texte libre dans le chat.** Contrairement au journal d'observations (`observationOrchestration.ts`, qui détecte une observation dans un message tapé), marquer un objectif précis « atteint » exige de désigner sans ambiguïté *quel* item du plan est concerné. Faire deviner ça à un LLM depuis une phrase libre est fragile et risque de modifier le mauvais objectif. On respecte plutôt le principe produit « l'enseignant ne doit jamais avoir à rédiger un prompt » : un bouton par objectif (à suivre / atteint / non atteint), pas une phrase à formuler.
- **Le bilan de révision reste une génération IA**, comme le reste du produit — mais **bloqué tant que chaque objectif n'a pas un statut explicite**. Aucun bilan ne se génère sur un plan encore « à suivre » : ça forcerait l'IA à halluciner un jugement sur un objectif jamais évalué par l'enseignant.
- **Une seule table**, pas une table par objectif : les items restent en JSONB (même choix que `pat_generations.pat jsonb`), chaque item du tableau portant son propre `status`. Le volume par enseignant est petit (quelques objectifs par élève suivi), une table `follow_up_plan_items` séparée serait une sur-ingénierie ici.
- **RLS** : 4 policies (`select`/`insert`/`update`/`delete`), `user_id = auth.uid()` en policy et re-vérifié en requête serveur (défense en profondeur, pattern `020_agent_student_observations.sql`).

## Schéma de données — nouvelle migration `032_follow_up_plan_tracking.sql`

```sql
create table if not exists public.follow_up_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  statut text not null default 'actif' check (statut in ('actif', 'termine')),
  items jsonb not null,
  bilan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- items : [{ sourceId, source, constat, objectif, indicateur, echeance, prochaineEtape,
--            status: 'a_suivre' | 'atteint' | 'non_atteint', revisionNote? }]

create index if not exists follow_up_plans_student_id_idx on public.follow_up_plans(student_id);
create index if not exists follow_up_plans_user_created_idx on public.follow_up_plans(user_id, created_at desc);

alter table public.follow_up_plans enable row level security;
-- 4 policies select/insert/update/delete, user_id = auth.uid(), même moule que classes/student_profiles.
-- trigger set_updated_at partagé (déjà utilisé ailleurs dans le projet) sur update.
```

Vérifier `ls supabase/migrations | sort -V | tail` avant d'écrire le fichier définitif (numérotation partagée, quelqu'un d'autre a pu committer une migration entretemps).

## Schéma Zod — `src/features/agent/schemas/followUpPlanTrackingSchema.ts` (nouveau)

```ts
export const followUpPlanItemStatusSchema = z.enum(['a_suivre', 'atteint', 'non_atteint'])

export const followUpPlanTrackedItemSchema = followUpPlanFinalItemSchema.extend({
  status: followUpPlanItemStatusSchema,
  revisionNote: z.string().trim().min(1).max(300).optional(),
})

export const followUpPlanRecordSchema = z.object({
  eleve: z.object({ nom: z.string().trim().min(1) }),
  statut: z.enum(['actif', 'termine']),
  items: z.array(followUpPlanTrackedItemSchema).min(1).max(10),
  bilan: z.string().trim().min(1).optional(),
})
```

## Découpage en 3 phases

### Phase A — Persister le plan dès sa génération

**Fichiers**
- Nouveau : `src/features/agent/server/followUpPlanTracking.ts` — `adoptFollowUpPlan(plan: FollowUpPlan): FollowUpPlanRecord` (fonction pure : `statut` → `'actif'`, chaque item reçoit `status: 'a_suivre'`).
- Modifié : `src/features/agent/server/followUpPlanOrchestration.ts` — ajoute une dépendance `savePlan(record): Promise<{ id: string }>`, appelée juste après une génération réussie (même emplacement que `saveBulletinComment` dans le flux bulletin).
- Nouveau : `src/features/agent/server/followUpPlanRepository.ts` — écrit dans `follow_up_plans` (implémentation Supabase de `savePlan`, branchée dans `src/app/api/agent/chat/route.ts`).

**Tests (rouges avant code)**
- `tests/unit/follow-up-plan-tracking.test.ts` : `adoptFollowUpPlan` fixe `statut: 'actif'` et `status: 'a_suivre'` sur chaque item, sans modifier les autres champs.
- Extension de `tests/unit/follow-up-plan-generation.test.ts` : une génération réussie appelle `savePlan` exactement une fois, avec le plan adopté (`statut: 'actif'`, tous les items `a_suivre`) ; un échec de génération n'appelle jamais `savePlan`.

**Critère d'acceptation** : après une génération réussie, le plan existe dans `follow_up_plans` avec statut `actif` et chaque objectif à `a_suivre`.

### Phase B — Marquer l'atteinte d'un objectif

**Fichiers**
- Modifié : `src/features/agent/server/followUpPlanTracking.ts` — ajoute `updateFollowUpPlanItemStatus(record, { sourceId, status, revisionNote? })`, fonction pure retournant `{ kind: 'updated', record }` ou `{ kind: 'item_not_found' }` (jamais d'exception pour un `sourceId` inconnu — l'appelant décide de la réponse).
- Nouveau : `src/features/agent/server/followUpPlanStatusService.ts` — service (pas un orchestrateur de chat) : charge le plan via le repository (RLS + vérification explicite `user_id`), applique `updateFollowUpPlanItemStatus`, sauvegarde. Appelé depuis une server action déclenchée par un bouton dans l'UI (pas depuis le fil de conversation).
- UI (à construire après le code de service, hors périmètre des tests unitaires ci-dessous) : petit composant listant les objectifs actifs d'un élève avec 3 boutons de statut par ligne.

**Tests (rouges avant code)**
- `tests/unit/follow-up-plan-tracking.test.ts` (mêmes fichier que Phase A, ajouts) : met à jour le statut d'un item identifié par `sourceId` sans toucher aux autres ; `sourceId` inconnu → `item_not_found`, plan inchangé ; une `revisionNote` fournie est conservée sur l'item.
- `tests/unit/follow-up-plan-status-service.test.ts` (nouveau) : plan appartenant à l'enseignant → mise à jour persistée ; plan d'un autre enseignant → refusé sans lecture des données (défense en profondeur RLS déjà testée ailleurs, même principe) ; `sourceId` inconnu → réponse explicite, aucune écriture.

**Critère d'acceptation** : un objectif marqué « atteint » ou « non atteint » par l'enseignant est retrouvé avec ce statut à la relecture du plan, sans jamais changer un autre objectif du même plan.

### Phase C — Bilan de révision

**Fichiers** (même moule `intent → orchestration → model → schema` que le reste de l'agent)
- Nouveau : `src/features/agent/schemas/followUpPlanReviewSchema.ts` — sortie générée `{ bilan: z.string().trim().min(1).max(600) }`.
- Nouveau : `src/features/agent/server/followUpPlanReviewIntent.ts` — détection de la demande (« prépare le bilan de révision du plan de suivi de X », fr/en/es, même style que `followUpPlanIntent.ts`).
- Nouveau : `src/features/agent/server/followUpPlanTracking.ts` (ajout) — `isFollowUpPlanReadyForReview(record): boolean` (vrai seulement si aucun item n'est resté `a_suivre`) ; `closeFollowUpPlan(record, bilan): FollowUpPlanRecord` (refuse si `isFollowUpPlanReadyForReview` est faux — jamais de bilan sur un plan pas entièrement évalué).
- Nouveau : `src/features/agent/mocks/followUpPlanReviewMock.ts` — mock-as-contract, à traverser avant de brancher l'IA réelle.
- Nouveau : `src/features/agent/server/followUpPlanReviewModel.ts` + prompt dédié — génère le bilan à partir des constats/objectifs/statuts réels uniquement (aucune invention si un item n'a pas de `revisionNote`).
- Nouveau : `src/features/agent/server/followUpPlanReviewOrchestration.ts` — trouve le plan actif de l'élève, bloque avec message explicite si aucun plan ou si `isFollowUpPlanReadyForReview` est faux (« il reste des objectifs sans statut »), sinon génère puis appelle `closeFollowUpPlan` et persiste.
- Modifié : `src/app/api/agent/chat/route.ts` — nouveau bloc d'intention, même ordre de priorité que PAT/bulletin/plan de suivi.

**Tests (rouges avant code)**
- `tests/unit/follow-up-plan-review-intent.test.ts` : détection fr/en/es, non-déclenchement sur une formulation proche (ex. demande du brouillon lui-même).
- `tests/unit/follow-up-plan-tracking.test.ts` (ajouts) : `isFollowUpPlanReadyForReview` faux tant qu'un item est `a_suivre` ; `closeFollowUpPlan` lève/refuse si appelé trop tôt ; réussi → `statut: 'termine'`, `bilan` renseigné.
- `tests/unit/follow-up-plan-review-orchestration.test.ts` : aucun plan actif pour l'élève → réponse explicite, aucune génération, aucun quota débité ; plan avec objectifs encore `a_suivre` → même blocage explicite, sans compter dans le quota (cohérent avec la règle déjà appliquée à l'alignement curriculaire dans le PRD) ; plan entièrement évalué → génération, quota débité une fois, plan clôturé.

**Critère d'acceptation** : un bilan n'est produit que lorsque chaque objectif du plan a un statut explicite, et le texte généré ne porte que sur les statuts réellement enregistrés.

---

## Ordre d'implémentation et dépendances

1. Phase A (persistance) — bloque B et C, rien d'autre à persister sans elle.
2. Phase B (mise à jour de statut) — bloque C (le bilan a besoin de statuts renseignés).
3. Phase C (bilan de révision) — dépend de A et B.

## Ce que ce plan ne couvre pas

Le composant UI de gestion des statuts (boutons par objectif) est mentionné en Phase B mais n'a pas de test unitaire dédié ici — ce projet ne teste pas les composants React en unitaire (voir `tests/unit/*`, uniquement de la logique pure et de l'orchestration). Il sera construit et vérifié manuellement une fois le service sous-jacent testé et validé.
