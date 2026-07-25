# Plan : Module 1 — Correction IA

> PRD source : docs/PRD.md

## Décisions architecturales

- **Routes** : `/correction` (liste des lots + historique), `/correction/new` (sélection classe → import copies par élève → choix du ton → lancement), `/correction/[batchId]` (relecture/validation copie par copie + tableau récapitulatif de classe en section de la même page).
- **Schema** : `correction_batches` (classe, ton, statut) et `correction_copies` (une ligne par élève du lot : texte, erreurs classées en JSONB, commentaire, statut, `validated_at`) — même moule RLS/trigger que le reste du projet (RLS 4-policies via `auth.uid() = user_id`, trigger `set_updated_at` partagé). Extension de `usage_counters` avec une colonne `feature` (au lieu d'une table dupliquée) pour isoler le quota de ce module.
- **Modèles clés** : ton de correction = `encourageant | factuel | direct` (fiche 15 du cahier des charges — distinct du ton du bulletin `bienveillant | encourageant | factuel`, pas le même enum). Catégories d'erreur fixes = `syntaxe | comprehension | methode`, réutilisées à l'identique pour le tableau récapitulatif.
- **Auth** : RLS Supabase + `getCurrentUser()`, comme partout ailleurs dans le projet.
- **Tiers** : Anthropic via Vercel AI SDK (déjà en place) pour la génération ; unpdf/mammoth (déjà en place) pour l'extraction de texte. Aucun nouveau service tiers.

---

## Phase 1 : Créer un lot et importer les copies de la classe

**User stories** : 1, 2, 3, 4, 5, 6

### Ce qu'on livre

L'enseignant sélectionne une classe existante (ou est invité à en créer une s'il n'en a aucune), voit la liste de ses élèves, et apporte pour chacun sa copie — texte collé ou fichier importé (texte/PDF texte). Le texte extrait s'affiche et reste modifiable avant de continuer. Un fichier scanné/image est rejeté avec un message clair. Les élèves sans copie renseignée sont simplement ignorés, pas bloquants. Le lot est sauvegardé, sans qu'aucune génération IA n'ait encore lieu.

### Critères d'acceptation

- [ ] Sans classe créée, l'enseignant voit une invitation claire à créer une classe (pas de formulaire vide inutilisable).
- [ ] La liste des élèves de la classe choisie s'affiche avec, pour chacun, une zone coller/importer.
- [ ] Le texte d'un fichier importé (texte/PDF texte) s'affiche et est modifiable avant sauvegarde.
- [ ] Un fichier scanné/image est refusé avec un message explicite, jamais silencieusement ignoré.
- [ ] Un lot peut être sauvegardé avec seulement une partie des élèves renseignés.
- [ ] Le lot et ses copies sont bien scopés à l'utilisateur (RLS vérifié).

## Bloquée par

Aucune — démarrable immédiatement.

---

## Phase 2 : Lancer la correction IA et suivre la progression

**User stories** : 7, 8, 9, 14, 19

### Ce qu'on livre

L'enseignant choisit le ton (encourageant, factuel, direct) pour tout le lot et lance la correction en une action. Chaque copie est traitée par l'IA (erreurs classées + commentaire), la progression est visible pendant le traitement. Une copie en échec peut être relancée individuellement sans perdre les autres. Le quota freemium dédié à ce module bloque avec un message clair une fois atteint.

### Critères d'acceptation

- [ ] Le ton choisi s'applique uniformément à toutes les copies du lot.
- [ ] La progression (copies traitées / restantes) est visible pendant la génération.
- [ ] Une copie en échec technique peut être relancée seule, sans repasser sur les copies déjà réussies.
- [ ] Le quota consommé est celui du compteur dédié à ce module, pas le compteur global partagé.
- [ ] Une fois le quota dédié atteint, un message clair explique pourquoi la génération ne démarre pas.

## Bloquée par

- Phase 1

---

## Phase 3 : Relire et valider chaque copie

**User stories** : 10, 11, 12, 13, 20

### Ce qu'on livre

Pour chaque copie corrigée, l'enseignant consulte les erreurs détectées classées par type et le commentaire généré, peut modifier le commentaire ou retirer une erreur mal détectée, puis valider en un clic pour passer à la copie suivante sans étape intermédiaire. Le commentaire ne contient jamais de formulation négative directe.

### Critères d'acceptation

- [ ] Les erreurs classées et le commentaire sont affichés ensemble pour chaque copie.
- [ ] Le commentaire est modifiable et une erreur détectée peut être retirée avant validation.
- [ ] La validation se fait en un clic et enchaîne automatiquement sur la copie suivante.
- [ ] Le statut de la copie (validée) est persistant et distinct des copies non encore relues.

## Bloquée par

- Phase 2

---

## Phase 4 : Mémoire pédagogique — calibrage sur les corrections validées

**User stories** : 18

### Ce qu'on livre

Chaque copie validée devient un exemple de calibrage pour les prochaines générations de commentaires. Si l'enseignant a modifié le commentaire avant validation, c'est cette version modifiée qui sert d'exemple, pas la proposition initiale de l'IA.

### Critères d'acceptation

- [ ] Un commentaire modifié puis validé est bien celui réutilisé comme exemple, pas la version générée initialement.
- [ ] Aucune action supplémentaire n'est demandée à l'enseignant pour activer ce calibrage.
- [ ] Le calibrage est observable : une génération suivante sur un contexte similaire reflète les exemples mémorisés.

## Bloquée par

- Phase 3

---

## Phase 5 : Tableau récapitulatif de classe

**User stories** : 15, 16

### Ce qu'on livre

Vue agrégée de la classe montrant, par catégorie d'erreur (syntaxe, compréhension, méthode), combien d'élèves sont concernés. Se met à jour à mesure que les copies sont validées.

### Critères d'acceptation

- [ ] Le tableau est visible dès qu'au moins une copie du lot est validée.
- [ ] Il se met à jour sans action supplémentaire quand une nouvelle copie est validée.
- [ ] Les catégories affichées sont les mêmes que celles utilisées pour la détection d'erreurs (Phase 2).

## Bloquée par

- Phase 3

---

## Phase 6 : Historique des copies validées par élève

**User stories** : 17

### Ce qu'on livre

Vue historique simple listant, par élève, les copies déjà corrigées et validées dans le temps.

### Critères d'acceptation

- [ ] L'historique d'un élève liste ses copies validées, les plus récentes en premier.
- [ ] Seules les copies validées apparaissent (pas les brouillons non relus).

## Bloquée par

- Phase 3
