# Plan technique — Corrections et ajouts demandés par le client

> Chaque point a été vérifié dans le code avant d'être placé ici — aucun n'est traité à l'aveugle sur la seule base du rapport client. Destiné à l'agent qui implémente. Ordre : bugs d'abord (causes déjà identifiées, corrections rapides et sûres), puis fonctionnalités, puis audit de performance.

---

## A — Bugs (causes identifiées)

### A1. La langue reste bloquée malgré le changement (inclut le tutoriel)

**Cause réelle trouvée, différente de ce qu'on pourrait croire** : le changement de langue fonctionne bien niveau base de données (`updateInterfaceLanguageAction` dans `profile.actions.ts` met à jour `teacher_profiles.interface_language` correctement). Le problème est que cette action appelle `revalidatePath('/dashboard', 'layout')` — mais le layout partagé (`(dashboard)/layout.tsx`, celui qui affiche le tutoriel avec `profile.interface_language`) est utilisé par TOUTES les pages du tableau de bord (`/classroom`, `/agent`, `/bulletin`, `/history`...), pas seulement `/dashboard`. Si l'enseignant change la langue depuis une autre page que `/dashboard`, cette page-là garde son ancien cache et affiche encore l'ancienne langue — d'où l'impression que "ça reste bloqué".

**Correction** :
- Dans `updateInterfaceLanguageAction` (`src/features/profile/server/profile.actions.ts`), remplacer `revalidatePath('/dashboard', 'layout')` par `revalidatePath('/', 'layout')` pour invalider tout l'arbre, pas seulement `/dashboard`.
- Dans `LanguageToggle.tsx`, après le succès de `updateInterfaceLanguageAction`, appeler `router.refresh()` (import `useRouter` de `next/navigation`) pour forcer la page courante à se re-synchroniser immédiatement côté serveur, sans attendre une navigation.

### A2. Avertissement `timeZone` manquant (next-intl) dans la page Historique

**Cause trouvée** : `AppLocaleProvider.tsx` initialise `<NextIntlClientProvider locale={locale} messages={{}}>` sans jamais passer de `timeZone` — c'est exactement ce qui déclenche l'avertissement à la ligne 182 de `UnifiedHistory.tsx` (`format.dateTime(...)`).

**Correction** :
- `teacher_profiles.timezone` existe déjà (migration `025`, rempli automatiquement selon le pays à l'inscription). Faire remonter cette valeur jusqu'à `AppLocaleProvider` (nouveau prop `initialTimeZone`, passé depuis les layouts serveur qui chargent déjà le profil) et la transmettre à `NextIntlClientProvider timeZone={timeZone}`.
- Valeur de repli si absente : `'UTC'`, jamais de plantage.

### A3. Avertissement Next.js sur `middleware` — **à vérifier avant d'agir, pas à appliquer tel quel**

Le projet est en Next.js `16.2.7`, une version très récente. Je n'ai pas pu confirmer avec certitude si le renommage `middleware.ts` → `proxy.ts` est une exigence stable de cette version précise ou une confusion. **Ne pas renommer le fichier sans avoir vérifié la documentation officielle de la version exacte installée** — un renommage à l'aveugle risquerait de casser l'authentification (le middleware actuel gère les redirections de session, voir `src/middleware.ts`). Étape à faire en premier : consulter le changelog Next.js 16 ou lancer `npm run build` pour voir si un avertissement explicite et actionnable apparaît, puis suivre exactement ce qu'il indique.

### A4. « Le PAT ne lit pas le modèle configuré »

Aucun bug trouvé dans le pipeline de génération lui-même (`patOrchestration.ts`, `selectDocumentTemplate`, `resolveDocumentTemplateContent`) — il est testé de bout en bout et fonctionne. L'explication la plus probable est la conséquence directe du point **B1** ci-dessous : si le modèle PDF n'est configurable qu'après la création de la classe, un enseignant qui ne repasse pas par l'édition n'a tout simplement **aucun modèle enregistré**, et l'agent bloque correctement (comportement voulu, pas un bug). **Corriger B1 d'abord, puis retester ce point avant d'investiguer plus loin.**

---

## B — Fonctionnalités demandées

### B1. Modèle de document disponible dès la création de la classe

Aujourd'hui, le champ texte est déjà disponible à la création ; seul le PDF exige d'enregistrer la classe une première fois (limite connue, documentée dans `TECHPLAN-onboarding-tutoriel.md`).

- `src/features/classroom/components/ClassroomHome.tsx` : permettre le téléversement du PDF dans le dialogue de création, pas seulement en édition. Deux façons de le faire, à trancher selon ce qui est le plus simple à coder proprement :
  - (a) Créer la classe silencieusement dès qu'un fichier est choisi (avant que l'enseignant clique "Enregistrer"), puis continuer l'édition normalement — évite de changer le flux d'upload existant.
  - (b) Garder le fichier en mémoire côté client jusqu'à la soumission du formulaire, et l'envoyer juste après la création réussie, dans la même action utilisateur.
  Recommandation : (a), plus proche du fonctionnement déjà en place pour le PDF en édition, moins de nouveau code.

### B2. Import DOCX pour le modèle (en plus du PDF)

**Point technique important** : Claude lit nativement un PDF joint tel quel (déjà en place), mais pas un `.docx` — il n'existe pas d'équivalent natif pour ce format. Un `.docx` importé doit donc être **converti en texte au moment du téléversement**, puis stocké et utilisé exactement comme le modèle texte déjà existant (pas un troisième mode à gérer dans la génération).

- **Nouvelle dépendance à valider avant installation** (règle du projet) : une bibliothèque d'extraction de texte `.docx` (ex. `mammoth`, légère, largement utilisée). Ne pas installer sans confirmation.
- `src/features/classroom/server/documentTemplateStorage.ts` : nouvelle fonction d'extraction, appelée à l'upload si le fichier est un `.docx` ; le texte extrait est enregistré dans `document_template` (colonne texte déjà existante), **pas** dans `document_template_path` (réservé au PDF natif).
- `ClassroomHome.tsx` : accepter `.docx` en plus de `.pdf` dans le champ de fichier, avec un message clair si l'extraction échoue (fichier corrompu, format inattendu).

### B3. Sélecteurs de notes alignés sur le système de notation du profil

Aujourd'hui (`EvaluationResultsGrid.tsx`), la note est un champ texte libre avec juste un exemple en filigrane (`PLACEHOLDERS`) — l'enseignant peut taper n'importe quoi.

- Pour `letter` et `letter_ca` : remplacer le champ texte par un vrai `<select>` avec les valeurs réellement utilisées (A/B/C/D/F pour `letter` ; à confirmer avec le client pour `letter_ca`, probablement A+/A/B+/B...).
- Pour `levels` : `<select>` avec les paliers réels utilisés par l'enseignant — **à confirmer avec le client**, ce ne sont pas des valeurs universelles.
- Pour `'20'`, `'10'`, `percentage` : garder un champ numérique, mais avec `type="number"` et les bornes `min`/`max`/`step` correspondantes plutôt qu'un texte libre sans contrainte.
- Champ concerné dans les deux endroits où une note se saisit : la grille groupée et la saisie individuelle (même composant, `EvaluationResultsGrid.tsx`).

### B4. Sélecteur de langue familiale universel

- Remplacer le champ texte libre (`ClassDetail.tsx`, création/édition d'élève) par un `<select>`.
- **Recommandation : liste statique intégrée au projet, pas d'API externe.** Une API ajouterait une dépendance réseau, un temps de chargement et un point de défaillance supplémentaire pour un besoin qui ne change jamais (la liste des langues du monde est stable). Une liste embarquée (nom + code, une centaine d'entrées courantes) est plus rapide, plus fiable, et ne nécessite aucune nouvelle dépendance.
- Conserver la valeur existante d'un élève déjà enregistré même si elle ne figure pas dans la liste (même principe déjà appliqué pour la matière dans `ClassroomHome.tsx` — ne jamais perdre silencieusement une donnée existante).

---

## C — Audit de performance

Un audit avait déjà été fait plus tôt dans ce projet et n'avait rien trouvé d'anormal — mais beaucoup de code a été ajouté depuis (carnet de résultats, historique unifié, détection de mention d'élève, import CSV). Je n'ai pas pu mesurer de vrai ralentissement sans faire tourner l'application avec un profileur — voici où regarder en premier, par ordre de suspicion :

1. **`npm run build` puis tester en production** (`next start`) plutôt qu'en développement — le mode développement de Next.js recompile à chaque route visitée, ce qui ressemble à de la lenteur alors que ça n'existe pas en production. C'est l'hypothèse la plus probable si la lenteur touche "les clics de bouton" de façon générale.
2. **`dashboardData.ts`** (page Historique) : la fonction fait désormais 11 requêtes en parallèle plus des requêtes secondaires — déjà en `Promise.all`, donc pas un problème évident, mais c'est la page la plus lourde du projet et la première à profiler avec les DevTools React si la lenteur se concentre sur `/history`.
3. **`EvaluationResultsGrid.tsx`** : la liste de résultats et la grille se re-rendent à chaque frappe dans un champ (`grades` est un objet recréé à chaque changement) — normal pour un formulaire, mais à vérifier avec le profileur si la classe a beaucoup d'élèves.
4. Ne pas deviner plus loin sans données réelles : lancer le profileur React DevTools sur les pages citées par le client, noter les composants qui se re-rendent le plus souvent, et revenir avec des mesures avant de corriger à l'aveugle.

---

## Ordre recommandé

A1 et A2 sont des corrections courtes et sûres — à faire en premier. A3 nécessite une vérification avant tout code. A4 se résout de lui-même une fois B1 fait. B1, B3, B4 sont indépendants entre eux. B2 attend une validation de dépendance. C est une investigation, pas une implémentation directe.
