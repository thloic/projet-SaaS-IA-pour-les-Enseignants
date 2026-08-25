# Plan technique — Import CSV des résultats d'évaluation

> Complète `docs/PRD-carnet-resultats.md` (déjà livré). Objectif : permettre de déverser toutes les notes d'une classe en une fois par fichier, en plus de la grille manuelle déjà construite. Décision actée avec le développeur : **CSV uniquement pour cette V1** — pas d'Excel (nouvelle dépendance à valider séparément), pas de PDF (extraction de tableau non fiable pour créer des lignes en base). Format volontairement strict et imposé, pas une tentative de parser n'importe quel CSV.

## Étape 0 — Vérifications

- Relire l'état actuel de `evaluationResults.actions.ts`, `EvaluationResultsGrid.tsx`, `evaluationResultBatchSchema` (`classroomSchema.ts`) — déjà livrés, à réutiliser au maximum, pas à dupliquer.
- Confirmer qu'aucune dépendance de parsing CSV n'existe déjà dans le projet (`package.json`) avant d'écrire un parseur maison.

---

## Étape 1 — Modèle CSV téléchargeable

- Nouvelle fonction serveur `exportClassEvaluationTemplateCsv(classId)` dans `evaluationResults.actions.ts` (ou fichier dédié) : génère un CSV à partir du roster réel de la classe (réutilise `listClassStudents`), deux colonnes : `Nom complet`, `Note`. La colonne Note est vide, prête à remplir dans un tableur.
- Format strict, documenté dans le fichier lui-même si besoin (première ligne = en-tête exact `Nom complet,Note`) : pas de virgule ni de guillemets dans les valeurs (les noms d'élèves n'en contiennent normalement pas) — permet un parseur volontairement simple, sans nouvelle dépendance.
- Bouton "Télécharger le modèle CSV" sur `EvaluationResultsGrid.tsx` (ou la page `/classroom/[classId]/evaluations`), à côté du bouton d'enregistrement existant.

---

## Étape 2 — Import du fichier rempli

- Champ de sélection de fichier `.csv` sur la même page, avec un champ "Titre" optionnel à côté (partagé pour tout l'import, exactement comme le titre de la saisie groupée déjà existante — pas de titre par ligne, pour rester cohérent avec `evaluationResultBatchSchema` qui n'en a qu'un par lot).
- Nouvelle action serveur `importClassEvaluationResultsCsvAction(classId, title, formData)` :
  1. Extrait le fichier, vérifie l'extension/le type `.csv`, limite de taille raisonnable (ex. 1 Mo, largement suffisant pour une liste d'élèves).
  2. Parse manuellement (pas de nouvelle dépendance) : découpe par ligne, découpe chaque ligne par virgule, vérifie l'en-tête exact attendu (`Nom complet,Note`) — rejette le fichier entier avec un message clair si l'en-tête ne correspond pas (évite de deviner un format différent).
  3. Pour chaque ligne de données : normalise le nom (même fonction de normalisation déjà utilisée pour la résolution d'élève ailleurs dans le projet — ne pas en écrire une nouvelle) et cherche une correspondance unique dans le roster de la classe.
  4. Sépare les lignes en deux groupes : correspondance unique + note non vide → prêtes à enregistrer ; le reste (nom introuvable, nom ambigu, note vide) → rapportées comme ignorées, avec le numéro de ligne et la raison.
  5. Enregistre les lignes valides via le même chemin que `saveEvaluationResultsBatchAction` (réutiliser la fonction existante, ne pas dupliquer la logique d'insertion/ownership).
  6. Retourne `{ savedCount, skipped: [{ line, reason }] }`.
- Affichage résultat : confirmation du nombre de lignes enregistrées + liste des lignes ignorées si non vide, sans jamais bloquer l'ensemble pour quelques lignes en erreur (cohérent avec la grille manuelle, qui accepte déjà des champs vides).

---

## Étape 3 — Tests

- `tests/unit/evaluation-csv-import.test.ts` : parsing d'un CSV valide, en-tête incorrect rejeté, ligne avec nom introuvable ignorée et rapportée, ligne avec nom ambigu (deux élèves au même nom dans la classe) ignorée et rapportée, ligne avec note vide ignorée, une seule ligne valide au milieu de lignes invalides est quand même enregistrée.
- `npx tsc --noEmit`, `npm run test:unit`, `npx eslint`.

---

## Hors périmètre

- Import Excel (`.xlsx`) ou PDF.
- Titre par ligne (un seul titre partagé par import, comme la saisie groupée).
- Correspondance par identifiant technique visible dans le fichier — uniquement par nom, dans le roster de la classe concernée.
- Aperçu avant import (le fichier s'importe directement, le rapport de lignes ignorées arrive après).
