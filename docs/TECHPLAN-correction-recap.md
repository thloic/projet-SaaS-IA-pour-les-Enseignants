# Plan technique — Tableau récapitulatif de classe (Correction IA, fonctionnalité #17)

> Cadré via `/interroge`. Découle de `docs/PRD.md` (US-15, US-16, critère de succès 3). Étape 1 des deux lacunes identifiées dans le module Correction IA — la mémoire de calibrage (#18) aura son propre cadrage et plan technique séparé, une fois celle-ci livrée.

## Décisions actées pendant le cadrage

- **Portée** : le tableau porte sur **le lot affiché** (une classe, une évaluation) — pas un historique multi-lots. Aucune nouvelle page, aucun nouveau fetch serveur.
- **Données comptées** : uniquement les copies au statut `validated`. Une copie `complete` non encore validée n'apparaît pas dans le tableau (cohérent avec le critère de succès : « à jour dès qu'une copie de la classe est validée »).
- **Unité de comptage** : par catégorie, le nombre de **copies distinctes concernées** (« combien d'élèves », US-15), pas le nombre brut d'occurrences d'erreurs. Une copie avec 3 erreurs de syntaxe compte pour 1 dans la catégorie « syntaxe ».
- **Emplacement** : directement sur `CorrectionBatchDetail.tsx`, calculé côté client à partir des données déjà chargées (`detail.copies` + l'état `statuses` déjà tenu par le composant) — se met à jour en direct à chaque validation, individuelle ou via « Tout valider », sans rechargement.
- **PRD mis à jour** (`docs/PRD.md`) : la validation groupée n'est plus « hors périmètre », c'est une décision d'implémentation assumée ; le scope du tableau (lot, copies validées uniquement, mise à jour immédiate) y est documenté.

## Confidentialité

Aucune nouvelle donnée exposée : le calcul se fait sur des données déjà envoyées au client pour l'affichage individuel des copies (`copy.findings`, `copy.status`). Aucun nouveau champ, aucune nouvelle requête.

## Intégrité

Fonction pure, déterministe, sans dépendance à l'IA : les catégories comptées viennent strictement des `findings` déjà classifiés et stockés en base au moment de la génération — aucune réinterprétation, aucun recalcul de catégorie.

## Disponibilité

Aucun nouvel appel réseau. Le calcul est un `useMemo` sur des données déjà en mémoire côté client — coût négligeable, pas de nouvel état de chargement à gérer.

## Fichiers concernés

- **Nouveau** : `src/features/correction/utils/correctionRecap.ts` — fonction pure `buildCorrectionBatchRecap`, sur le modèle de `prepareBatchCopies.ts` (déjà dans le même dossier `utils/`).
- **Modifié** : `src/features/correction/components/CorrectionBatchDetail.tsx` — affichage du tableau, recalculé via `useMemo` à partir de `detail.copies` et de l'état local `statuses` déjà tenu par le composant (pour refléter les validations en cours de session sans attendre `router.refresh()`).
- **Modifié** : `docs/PRD.md` — déjà fait pendant le cadrage (voir ci-dessus).

## Tests unitaires à écrire avant le code

`tests/unit/correction-recap.test.ts` :
- lot avec plusieurs copies validées, catégories mixtes → chaque catégorie compte le nombre de copies distinctes concernées, pas le nombre d'erreurs (ex. une copie avec 2 erreurs « syntaxe » ne compte que pour 1).
- copies non validées (`pending`/`generating`/`complete`/`failed`) exclues du calcul, même si elles ont des `findings`.
- aucune copie validée → `status: 'no_data'`, aucune catégorie inventée.
- tri des catégories par nombre de copies concernées décroissant.

## Critères d'acceptation

- Un lot avec au moins une copie validée affiche le tableau, avec le nombre de copies concernées par catégorie.
- Un lot sans copie validée n'affiche pas de tableau, ou affiche un état vide explicite — jamais un tableau à zéro trompeur.
- Valider une copie (individuellement ou via « Tout valider ») met à jour le tableau immédiatement, sans rechargement de page.
