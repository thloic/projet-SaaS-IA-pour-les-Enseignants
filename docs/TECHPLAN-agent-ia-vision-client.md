# Plan technique — Agent IA : fonctions faisables du retour client

> Découle de `docs/PRD-agent-ia-vision-client.md`. Couvre uniquement le bloc « faisable maintenant, sans apport de contenu du client » identifié dans ce PRD (les items bloqués par un référentiel curriculaire, un calendrier scolaire, ou une intégration externe ne sont pas dans ce plan — ils auront leur propre PRD/TECHPLAN quand ce contenu ou cette décision arrivera).
>
> **Une phase = une fonctionnalité = une session.** Ne pas enchaîner deux phases dans la même session (règle §4.1 `CLAUDE.md`). Chaque phase attend une validation explicite avant codage, et à l'intérieur de chaque phase : **tests unitaires écrits et rouges avant tout code de production**, puis code jusqu'à ce qu'ils passent.

---

## Normes transverses (s'appliquent à chaque phase, non répétées ci-dessous)

**Confidentialité**
- Toute nouvelle table ou colonne touchant des données d'élève : RLS activée, 4 policies (`select`/`insert`/`update`/`delete`), filtrage explicite `user_id = auth.uid()` en requête serveur en plus de la policy (défense en profondeur — pattern déjà utilisé dans `020_agent_student_observations.sql` : la policy revérifie l'appartenance de l'élève ET de la classe à l'enseignant).
- Clé API IA côté serveur strict, jamais de préfixe `NEXT_PUBLIC_`.
- Aucune donnée d'élève envoyée à l'IA au-delà de ce qui est strictement nécessaire à la génération demandée ; pas de récupération silencieuse de données d'un autre élève ou d'une autre classe.
- Jeux de test et fixtures : prénoms fictifs uniquement, jamais de vraies données d'élèves dans un test ou un log.

**Intégrité**
- Toute sortie IA validée par un schéma Zod avant stockage ou affichage ; parsing JSON défensif (`try/catch`, jamais de `JSON.parse` non protégé sur une sortie modèle).
- **Discipline mock-as-contract** (héritée de `AGENT_IA_SPEC.md` §5) : chaque phase implémente d'abord une sortie mockée au format Zod final, fait traverser tout le pipeline (détection d'intention → orchestration → validation → affichage → export si applicable), **puis seulement** branche l'appel IA réel.
- Garde-fous produit non négociables, valables pour les 7 phases : aucune sortie ne devient définitive sans un clic de validation explicite de l'enseignant ; aucun envoi (parent, bulletin final) n'est déclenché par l'agent lui-même.
- Reformulation bienveillante (jamais de négatif direct sur un élève) appliquée à toute sortie qui mentionne un élève, comme déjà fait pour le PAT et le bulletin.

**Disponibilité**
- Quota freemium par fonctionnalité via `increment_usage(p_feature => ...)` (pattern `018_correction_generation.sql`) — jamais un compteur partagé qui viderait le quota d'une autre fonction. Un message d'erreur système (timeout IA, panne) ne décompte jamais le quota et ne casse jamais un message déjà reçu (pattern déjà décrit dans `PRD-agent-experience-conversation.md`, critère d'acceptation 6).
- Aucune erreur technique brute affichée à l'enseignant ; message naturel en français, action de reprise claire (« réessayer », « vérifier l'historique »).
- Une génération longue (lot de classe) reste interrompable sans perdre le travail déjà validé — pattern déjà en place pour la correction de lot.

**Respect des normes du projet**
- Stack : Next.js, TypeScript strict, Tailwind + shadcn/ui, Supabase (SSR + RLS), Vercel AI SDK, aucune nouvelle dépendance sans validation préalable.
- Organisation des fichiers : `src/features/<domaine>/{schemas,server,components,types}`, pipeline `intent → orchestration → model → schema` comme pour le PAT (`patIntent.ts → patOrchestration.ts → patModel.ts → patSchema.ts`).
- Tests : `node --test --experimental-strip-types`, mêmes conventions que `tests/unit/pat-intent.test.ts` (assert.deepEqual/equal, un test par comportement observable, cas nominal + cas limites explicitement nommés).
- Fin de chaque phase : `npx tsc --noEmit`, `npm run test:unit`, `npm run test:integration` (si un flux bout-en-bout est concerné), `npx eslint` sur les fichiers touchés, vérifier `ls supabase/migrations | sort -V | tail` avant toute nouvelle migration (numérotation partagée).
- Commit uniquement après validation du développeur, message en français décrivant ce qui a été fait.

---

## Phase 1 — Analyse d'erreurs de groupe exploitable dans la conversation

**Objectif** (US-1, US-8 du PRD) : dans l'agent conversationnel, une question du type « quelles sont les erreurs les plus fréquentes de ma classe » retourne les catégories d'erreurs les plus courantes sur les copies déjà corrigées et validées, avec une piste de reprise concrète. Sans données suffisantes, l'agent le dit clairement plutôt que d'inventer une tendance.

**Confidentialité** : l'agrégation ne lit que les `correction_copies` déjà appartenant à l'enseignant (RLS existante `017_correction_module.sql` suffit, aucune nouvelle table de données élève).

**Intégrité** : la piste de reprise (« mini-leçon ») est un texte généré par IA à partir des catégories agrégées réelles, jamais une catégorie ou un chiffre inventé si aucune copie n'est validée pour la classe.

**Disponibilité** : réutilise le chemin d'exécution du chat général existant, pas de nouveau job planifié ; répond dans le tour de conversation en cours (pas de délai supplémentaire notable, l'agrégation est une requête simple).

**Fichiers concernés**
- Nouveau : `src/features/agent/server/classErrorAnalysis.ts` — agrège `findings` par catégorie sur les `correction_copies` validées d'une classe (fenêtre : mêmes 30 jours par défaut que `classContextCore.ts`, réutiliser sa logique de fenêtre plutôt que la dupliquer).
- Modifié : `src/features/agent/server/classContextCore.ts` ou `classContext.ts` — injecter le résultat de l'agrégation dans le contexte déjà construit pour une question de classe (réutilise la détection de classe existante `classMentionDetection.ts`, ne pas la réécrire).
- Modifié : `src/lib/prompts/agent.ts` — section dédiée « analyse d'erreurs de classe », isolée du reste du prompt (même principe que la section élève déjà prévue dans `TECHPLAN-prochaines-etapes.md` item 2).
- Pas de nouvelle route API : passe par `src/app/api/agent/chat/route.ts` existant.

**Tests unitaires à écrire avant le code**
- `tests/unit/class-error-analysis.test.ts` :
  - classe avec plusieurs copies validées, catégories mixtes → catégorie la plus fréquente identifiée avec le bon décompte ;
  - classe sans aucune copie validée → résultat explicite « pas assez de données », pas de tendance inventée ;
  - copies non validées (statut `pending`/`generating`) exclues de l'agrégation ;
  - copies hors fenêtre par défaut exclues (si la fenêtre de `classContextCore` s'applique ici).

**Critères d'acceptation**
- Une classe avec au moins un lot validé répond avec le classement réel des catégories d'erreurs, sans nouvelle sollicitation que la question posée.
- Une classe sans lot validé répond explicitement l'absence de données, sans compter dans le quota si l'agent bloque avant génération.

---

## Phase 2 — Grille de correction personnelle de l'enseignant

**Objectif** (US-4 du PRD) : l'enseignant peut fournir sa propre grille de correction (texte collé/saisi) pour une classe ; si elle est fournie, la pré-correction s'appuie dessus au lieu du comportement par défaut. Absence de grille = comportement actuel inchangé (pas de blocage, contrairement aux modèles de document qui bloquent la génération).

**Confidentialité** : la grille est un texte de configuration lié à la classe de l'enseignant, RLS identique au reste (`user_id = auth.uid()`).

**Intégrité** : la grille fournie est injectée telle quelle dans le prompt de génération de correction, jamais réinterprétée ou remplacée silencieusement ; le schéma de sortie (`generatedCorrectionSchema`) reste inchangé — seule l'entrée du prompt change.

**Disponibilité** : aucun nouveau chemin de génération ; la grille est simplement une variable optionnelle du prompt existant.

**Fichiers concernés**
- Nouvelle migration `031_class_correction_rubric.sql` — colonne texte optionnelle sur `classes` (ou nouvelle table si une classe peut avoir plusieurs versions dans le temps — trancher pour une colonne simple unique, cohérent avec la décision « un seul modèle actif » déjà prise pour `PRD-agent-modeles.md`), RLS héritée de `classes`.
- Modifié : `src/features/correction/server/correctionGeneration.service.ts` — lit la grille de la classe si présente, l'injecte dans le prompt de génération.
- Composant UI : réutiliser l'emplacement de configuration de classe déjà utilisé pour le modèle de document (`documentTemplateResolution.ts` / composant associé) plutôt que d'en créer un nouveau — même schéma d'interaction (texte libre collé/saisi).

**Tests unitaires à écrire avant le code**
- `tests/unit/correction-rubric.test.ts` :
  - classe avec grille configurée → le prompt de génération contient la grille fournie ;
  - classe sans grille → comportement actuel du prompt inchangé (aucune régression) ;
  - grille vide après trim → traitée comme absente, pas comme une chaîne vide injectée.

**Critères d'acceptation**
- Une grille fournie par l'enseignant est retrouvée dans le prompt envoyé au modèle lors de la pré-correction suivante, vérifiable critère par critère dans les sorties générées.

---

## Phase 3 — Brouillon de plan de suivi à partir des observations existantes

**Objectif** (US-2, US-9 du PRD) : à partir des observations et adaptations déjà consignées sur un élève (`student_observations`, `institutional_adaptations`), l'agent produit un brouillon de plan de suivi structuré. Étend l'action PAT existante plutôt que de créer un flux parallèle : mêmes garde-fous (Zod, reformulation bienveillante, mock-as-contract).

**Confidentialité** : lecture de `student_observations` et `student_profiles.institutional_adaptations` limitée à l'élève et l'enseignant concernés — même double vérification RLS que `020_agent_student_observations.sql`.

**Intégrité** : chaque élément du brouillon référence l'observation ou l'adaptation d'origine (traçabilité demandée par le PRD, décision d'implémentation) ; si aucune observation n'existe pour l'élève, l'agent le dit avant de proposer un brouillon vide ou halluciné.

**Disponibilité** : réutilise le pipeline PAT existant (intent → orchestration → model → schema), pas de nouvelle infrastructure.

**Fichiers concernés**
- Nouveau : `src/features/agent/schemas/followUpPlanSchema.ts` — structure du brouillon (constat, objectif, prochaine étape), chaque item avec un champ `source` (référence à l'observation/adaptation d'origine).
- Nouveau : `src/features/agent/server/followUpPlanIntent.ts`, `followUpPlanOrchestration.ts`, `followUpPlanModel.ts` — même découpage que `pat*.ts`.
- Mock d'abord : `src/features/agent/mocks/followUpPlanMock.ts` (même discipline que `patMock.ts`) — traverser tout le pipeline avant de brancher l'IA réelle.
- Modifié : `src/app/api/agent/chat/route.ts` — nouveau bloc d'intention, positionné dans le même ordre de priorité que PAT/bulletin/modification.

**Tests unitaires à écrire avant le code**
- `tests/unit/follow-up-plan-intent.test.ts` : détection de la demande (formulations variées, comme `pat-intent.test.ts`), non-déclenchement sur une formulation proche mais différente.
- `tests/unit/follow-up-plan-generation.test.ts` (avec le mock) : élève avec observations → brouillon dont chaque item référence une observation réelle ; élève sans observation → réponse explicite d'absence de données, pas de brouillon vide généré.

**Critères d'acceptation**
- Le brouillon généré pour un élève avec observations reprend au moins une observation ou adaptation réellement enregistrée, vérifiable en comparant à sa fiche.
- Un élève sans observation ne produit aucun brouillon halluciné.

---

## Phase 4 — Commentaire de bulletin basé sur les traces réelles de l'année

**Objectif** (US-3 du PRD) : le commentaire de bulletin généré par l'agent s'appuie sur les résultats et observations réels de l'élève durant l'année en cours, pas uniquement sur ce que l'enseignant retape dans le tour de conversation. Dépend de la Phase 3 (même mécanisme de lecture des observations, appliqué au flux bulletin existant).

**Confidentialité** : mêmes tables, mêmes policies que Phase 3 ; ajout d'une lecture de `evaluation_results` de l'élève, déjà RLS-protégée (`026_evaluation_results.sql`).

**Intégrité** : le commentaire référence au moins un résultat ou une observation réels ; conserve la règle « jamais de négatif direct » déjà appliquée au bulletin.

**Disponibilité** : étend le flux bulletin existant (`bulletinOrchestration.ts`), pas de nouveau chemin d'exécution séparé.

**Fichiers concernés**
- Modifié : `src/features/agent/server/bulletinOrchestration.ts` / `bulletinExtractionModel.ts` — enrichir le contexte injecté avec les résultats et observations de l'année de l'élève avant génération (au lieu de ne dépendre que des informations tapées dans la conversation).
- Modifié : prompt bulletin (localiser dans `src/lib/prompts/agent.ts` ou équivalent bulletin) — instruction explicite de s'appuyer sur les traces fournies, jamais d'invention si elles sont absentes.

**Tests unitaires à écrire avant le code**
- `tests/unit/bulletin-agent.test.ts` (étendre le fichier existant) : élève avec résultats/observations de l'année → le contexte transmis au modèle les inclut ; élève sans aucune trace → comportement actuel inchangé (pas de régression), message clair si la génération en dépend explicitement.

**Critères d'acceptation**
- Un commentaire généré pour un élève avec des traces dans l'année référence au moins un résultat ou une observation réels, vérifiable dans le texte produit.

---

## Phase 5 — Variantes A/B/C d'un examen

**Objectif** : extension du moteur de différenciation existant (5 variantes déjà livrées, fonctionnalité #6) à un nouveau cas d'usage — produire plusieurs versions équivalentes d'une évaluation à partir d'un même document source, plutôt que des niveaux de soutien/enrichissement.

**Confidentialité** : aucune nouvelle donnée sensible ; le document source suit le même traitement que l'upload existant (fonctionnalité #5).

**Intégrité** : les variantes générées restent des propositions à exporter/valider comme les variantes actuelles, jamais publiées automatiquement.

**Disponibilité** : réutilise le pipeline de génération de variantes existant, ajoute un mode de sortie plutôt qu'un nouveau moteur.

**Fichiers concernés** : à localiser précisément dans le module de différenciation existant (`src/features/*` du module 2) au moment de la phase — ne pas dupliquer le moteur de variantes déjà en place, y ajouter un mode « versions équivalentes » distinct du mode « niveaux de soutien ».

**Tests unitaires à écrire avant le code**
- Nouveau test sur le schéma de sortie du mode « variantes A/B/C » : cohérence de structure entre les versions générées (même nombre de questions, même barème), pas de fuite d'une variante dans une autre.

**Critères d'acceptation**
- À partir d'un même document source, trois versions structurellement équivalentes sont produites et exportables séparément.

---

## Phase 6 — Convertir un document source en questionnaire ou guide d'étude

**Objectif** : à partir d'un document déjà déposé (texte/PDF numérique — pas de photo ni de scan, hors périmètre du PRD), générer un questionnaire ou un guide d'étude. Extension du moteur de génération existant, nouveau format de sortie.

**Confidentialité/Intégrité/Disponibilité** : mêmes garanties que le reste du module de génération de documents ; sortie validée par un schéma Zod dédié au format questionnaire/guide.

**Fichiers concernés** : nouveau schéma de sortie (`questionnaire` / `guideEtude`) dans le module de génération existant ; réutilise l'upload de document source déjà en place (fonctionnalité #5), pas de nouvel import.

**Tests unitaires à écrire avant le code**
- Génération à partir d'un document source texte → structure de questionnaire valide (questions, réponses attendues) ; document source vide ou illisible → message clair, pas de génération vide.

**Critères d'acceptation**
- Un document source déjà déposé produit un questionnaire ou un guide d'étude structuré, exportable comme les autres livrables.

---

## Phase 7 — Compte rendu de rencontre parent depuis des notes tapées

**Objectif** : à partir de notes tapées par l'enseignant pendant ou après une rencontre avec un parent, l'agent produit un compte rendu structuré. Version texte uniquement (la dictée vocale est hors périmètre du PRD, pas d'infrastructure de saisie vocale dans le produit).

**Confidentialité** : le compte rendu peut mentionner un élève — mêmes règles de reformulation bienveillante et d'isolation par enseignant que les autres documents élève.

**Intégrité** : le compte rendu reste un brouillon à valider avant tout archivage ou envoi ; pas de génération de contenu au-delà de ce que les notes fournies contiennent.

**Disponibilité** : nouveau flux conversationnel léger, même pipeline intent → orchestration → schema que les autres actions rapides de l'agent.

**Fichiers concernés** : nouveau triplet `meetingSummaryIntent.ts` / `meetingSummaryOrchestration.ts` / schéma associé, sur le modèle des phases précédentes.

**Tests unitaires à écrire avant le code**
- Détection de l'intention à partir de formulations variées ; génération à partir de notes minimales → structure de compte rendu cohérente ; notes vides → message clair plutôt qu'un compte rendu halluciné.

**Critères d'acceptation**
- Des notes tapées produisent un compte rendu structuré, fidèle au contenu fourni, sans invention.

---

## Ordre recommandé et dépendances

1. Phase 1 (analyse d'erreurs de groupe) — indépendante, s'appuie sur des données déjà existantes.
2. Phase 2 (grille de correction) — indépendante, même module que Phase 1.
3. Phase 3 (brouillon de plan de suivi) — indépendante.
4. Phase 4 (bulletin traces réelles) — **dépend de Phase 3** (même mécanisme de lecture des observations).
5. Phase 5 (variantes A/B/C) — indépendante, module différenciation.
6. Phase 6 (document → questionnaire/guide) — indépendante, module différenciation.
7. Phase 7 (compte rendu rencontre parent) — indépendante.

Phases 1-4 correspondent aux 3 fonctions que le client identifie lui-même comme prioritaires (« test des 3h/mois ») ; à traiter avant 5-7 sauf contrainte du développeur.

---

## Ce que ce plan ne couvre pas

Conformément au PRD : alignement curriculaire, calendrier pédagogique vivant, intégrations externes (LMS, carnet de notes), OCR, alertes proactives, breffage automatique, repérage de texte généré par IA. Chacun attend soit un apport du client, soit une décision produit séparée avant d'avoir son propre plan technique.
