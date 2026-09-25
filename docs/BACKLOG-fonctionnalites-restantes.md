# Backlog vivant — fonctionnalités restantes (retour client complet)

> **Ce fichier est différent des `PRD-*`/`TECHPLAN-*` du dossier `docs/`** : ceux-là restent comme trace historique d'une décision de scope. Celui-ci est **purgé au fur et à mesure** — quand une ligne est livrée et validée par le développeur, elle est **retirée du fichier**, pas juste cochée. Le fichier doit tendre vers zéro ligne.
>
> Source : synthèse du retour client du 2026-09-25 (cahier des charges du produit vu par le client), croisée avec `docs/cahier-des-charges.md` et l'état réel du code au moment de la rédaction.
>
> **Règle de travail (héritée de `CLAUDE.md` §4.1)** : une ligne = une fonctionnalité = une session. Chaque ligne attend une validation explicite du développeur avant tout code. Ne jamais enchaîner deux lignes dans la même session.

---

## 0. Architecture transverse

Ces décisions ne sont pas liées à une fonctionnalité précise — elles conditionnent comment on va coder plusieurs lignes du Tier 3 ci-dessous. **À valider explicitement avant d'attaquer la première ligne du Tier 3**, parce qu'elles révoquent en partie une décision actée dans `docs/AGENT_IA_SPEC.md` §1 (« pas de tool calling réel en V1 »).

### A. Génération de contenu (Tier 1 et 2) — aucun changement d'architecture
On garde le pattern déjà en place et déjà éprouvé (PAT, bulletin, plan de suivi, variantes d'examen) :
`<feature>Intent.ts → <feature>Orchestration.ts → <feature>Model.ts → <schema>.ts`, discipline mock-as-contract, sortie Zod-validée, RLS `user_id`. Toute nouvelle fonction de génération (courriels parents, traduction, compte-rendu de rencontre, questionnaire/guide d'étude, documentation services complémentaires) suit ce même moule. Rien de nouveau à décider ici.

### B. L'agent lit ses propres données — tool calling interne, lecture seule
Pour que l'agent devienne proactif (Tier 3), il doit pouvoir aller chercher lui-même ce dont il a besoin plutôt qu'on lui construise un détecteur d'intention par cas d'usage (comme `classMentionDetection.ts` aujourd'hui).

- Utiliser `tool()` du **Vercel AI SDK** (déjà dans la stack — aucune nouvelle dépendance) pour exposer un petit nombre d'outils **internes, en lecture seule**, sur les données déjà RLS-protégées de l'enseignant courant :
  - `getClassErrorStats(classId)`
  - `getStudentObservations(studentId)`
  - `getStudentEvaluationResults(studentId)`
  - `getUpcomingDeadlines()` (utilisable seulement une fois le calendrier scolaire fourni par le client)
- **Aucun outil d'écriture, aucun outil réseau externe** à ce stade. Chaque outil doit réutiliser les fonctions repository déjà existantes (`classContextRepository.ts`, `memory.ts`) — pas de nouveau chemin de lecture de données créé en parallèle.
- Migration progressive, pas de big-bang : les orchestrateurs actuels (PAT, bulletin, plan de suivi) restent tels quels. Le tool calling n'est introduit que pour les **nouvelles** fonctions proactives du Tier 3.

### C. Couche planifiée (proactif) — Vercel Cron
- Nouveau `vercel.json` avec un cron (ex. lundi 6h) qui appelle une route API protégée par un secret (`CRON_SECRET`, pattern standard Vercel — à documenter dans `.env.example`).
- Cette route itère les enseignants actifs, appelle les outils de lecture (B), applique des **seuils explicites et lisibles** (pas de ML — ex. « 3 absences en 2 semaines » — cohérent avec le principe produit : une fonctionnalité doit faire gagner du temps de façon fiable et vérifiable) :
  - **Breffage du lundi** → envoyé directement par courriel à l'enseignant via **Resend** (déjà dans la stack). Légitime : ce n'est pas une communication vers un parent, seulement un résumé à l'enseignant sur lui-même.
  - **Alertes de trajectoire élève** → stockées comme notification **in-app**, jamais auto-envoyées par courriel. Cohérent avec le principe « aucune donnée élève ne sort sans nécessité » — visible seulement quand l'enseignant se connecte.
- Une seule table `agent_notifications` (`user_id`, `type`, `payload jsonb`, `created_at`, `read_at`) pour tous les types de signal proactif, plutôt qu'une table par type.

### D. Intégrations externes — seam d'adaptateur, rien à coder maintenant
Quand on y arrivera (Tier 4, tout en bas) : un dossier `src/features/integrations/<provider>/` par intégration (Classroom, Teams, Mozaïk...), chacun implémentant une interface minimale commune (`listRoster()`, `listGrades()`), pour que l'agent consomme ces données sans savoir de quel LMS elles viennent. **Rien à construire aujourd'hui** — seulement nommer la coupe pour ne pas avoir à refactorer le cœur de l'agent plus tard.

### Nouvelles dépendances envisagées
Aucune pour A/B/C ci-dessus — tout est déjà dans la stack (Vercel AI SDK `tool()`, Vercel Cron natif, Resend). Chaque dépendance listée ci-dessous n'est qu'une **hypothèse à valider le jour venu**, jamais installée par anticipation (règle `CLAUDE.md` §4.5) :
- OCR manuscrit / transcription vidéo (Tier 4) — à évaluer seulement une fois les échantillons réels du client reçus.
- SDK Google Classroom, SDK Microsoft Graph (Tier 4) — à évaluer un par un, au moment de chaque intégration.

---

## Tier 1 — trivial (réutilise le pipeline existant tel quel)

- [ ] **Suivi d'atteinte des objectifs du plan de suivi** (SMART + bilan de révision) — extension de `followUpPlan*.ts` déjà en place, ajoute un statut d'atteinte dans le temps.
- [ ] **Traduction des messages parents** — mode traduction sur un texte déjà généré ; langue déjà disponible dans `teacher_profiles`/`student_profiles`. *(Dépend d'abord de la ligne « brouillons de courriels parents » ci-dessous pour avoir un texte à traduire.)*

## Tier 2 — moyen (nouveau triplet intent/orchestration/schema, patron déjà connu)

- [ ] **Brouillons de courriels parents** (registres de ton, situations délicates : comportement, échec, plagiat) — module 3 pas encore commencé.
- [ ] **Compte rendu de rencontre parent** à partir de notes tapées — spécifié Phase 7 de `TECHPLAN-agent-ia-vision-client.md`. Dictée vocale explicitement hors périmètre.
- [ ] **Document → questionnaire / guide d'étude** — spécifié Phase 6 de `TECHPLAN-agent-ia-vision-client.md`, réutilise l'upload existant.
- [ ] **Portail de communication centralisé (historique)** — dépend de « brouillons de courriels parents ».
- [ ] **Documentation orthopédagogie / psychoéducation** — même patron que le PAT. **Bloqué en partie** : besoin d'un gabarit institutionnel type, apport client comme pour le PAT.

## Tier 3 — nécessite la brique agentique (architecture §0.B/C)

- [ ] **Signalement de trajectoire élève** (chute de rendement, absences répétées, participation en baisse) — faisable d'abord *sans* cron, en requête déclenchée à l'ouverture du dashboard sur les données déjà en base.
- [ ] **Breffage du lundi matin** — première vraie brique planifiée (§0.C).
- [ ] **Rappels d'échéances calendrier scolaire** — même infra cron que le breffage, mais **bloqué** tant que le calendrier scolaire de l'établissement n'est pas fourni (item 24 `CLAUDE.md`).
- [ ] **Repérage de tâches répétitives à automatiser** — nécessite d'exploiter PostHog (déjà dans la stack) ; mal défini, à qualifier avec le client avant de coder quoi que ce soit.
- [ ] **Repérage de texte généré par IA dans les copies** — techniquement faisable mais peu fiable ; le client lui-même exige « sans accusation automatique ». Chantier de prudence méthodologique à part, pas une simple ligne de code.

## Tier 4 — bloqué par du contenu ou une décision client (indépendamment de la difficulté technique)

- [ ] **Alignement PFEQ / programme officiel** — bloqué par le référentiel de compétences structuré (item 22 `CLAUDE.md`) ; aucune API officielle n'existe.
- [ ] **Planification annuelle vivante** (tempête, journée pédagogique déplacée) — bloqué par le calendrier scolaire officiel (item 24).
- [ ] **Conversion photo de manuel / capsule vidéo → exercices** — OCR manuscrit (item 26, besoin de vraies copies pour tester) + transcription vidéo = nouvelle dépendance à valider. Piste économe pour la partie « photo de texte imprimé » : Claude Sonnet gère déjà l'image nativement via le Vercel AI SDK, à distinguer de l'OCR manuscrit d'élève qui reste plus dur.
- [ ] **Intégrations Google Classroom / Microsoft Teams / Mozaïk-Portail / GPI / Pluriportail / carnet de notes / calendrier institutionnel** — le PRD `docs/PRD-agent-ia-vision-client.md` tranche déjà explicitement cet ordre : reportées en toute fin, après preuve de valeur sur les données internes. Chaque intégration = nouveau SDK OAuth à valider individuellement + comptes développeur (apport client, item 34).

---

## Prochaine étape recommandée

~~Finaliser le bulletin « traces réelles »~~ — **vérifié le 2026-09-25 : déjà entièrement construit et testé** (voir `TECHPLAN-agent-ia-vision-client.md` Phase 4), rien codé, ligne retirée. Les 3 items que le client identifie comme passant son « test des 3h/mois » sont maintenant tous livrés : analyse de groupe ✅, plans de suivi ✅, bulletin ✅.

Prochaine ligne : **suivi d'atteinte des objectifs du plan de suivi** (Tier 1) — extension directe de `followUpPlan*.ts` déjà en place.
