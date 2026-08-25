# Plan : Carnet de résultats par classe

> PRD source : `docs/PRD-carnet-resultats.md`

## Décisions architecturales

- **Schema** : une seule table plate `evaluation_results` (id, user_id, class_id, student_id, title nullable, grade text, created_at) — pas d'entité "évaluation" séparée : la grille de saisie groupée crée simplement plusieurs lignes partageant le même titre en une seule action. RLS 4 policies (`auth.uid() = user_id`), même moule que les migrations existantes.
- **Format de note** : `grade` reste du texte libre, sans validation de plage ni conversion — reflète tel quel le système de notation du profil enseignant (chiffré, lettres, paliers).
- **Circulation de la donnée** : les résultats rejoignent le pipeline `getStudentContext` existant (même principe que observations/participations/présences, bornés aux plus récents), pas un mécanisme parallèle. Chaque résultat porte son `classId`, pour que le bulletin puisse filtrer sur la classe concernée.
- **Portée du garde-fou "au moins une donnée"** : résultats filtrés sur la classe de la demande (ils sont intrinsèquement liés à une matière) ; observations prises globalement, comme `getStudentContext` les agrège déjà aujourd'hui (aucun changement de portée sur les observations).
- **Pas de lien avec Correction IA** (confirmé, hors périmètre).

---

## Phase 1 : Saisie des résultats par classe

**User stories** : PRD US-1, US-2, US-3, US-4, US-5, US-6, US-9

### Ce qu'on livre

Dans une classe, l'enseignant ouvre une grille (élèves × une évaluation), y saisit un titre optionnel et une note par élève, laisse vides ceux qui n'ont pas encore de résultat, puis enregistre tout en une fois. Il peut aussi ajouter, modifier ou supprimer le résultat d'un seul élève à tout moment, en dehors de la grille. Les résultats déjà saisis pour la classe sont consultables.

### Critères d'acceptation

- [ ] Un enseignant saisit des résultats pour plusieurs élèves de sa classe en une seule action.
- [ ] Laisser un élève sans note dans la grille n'empêche pas d'enregistrer les autres.
- [ ] Le titre d'évaluation est optionnel, sans blocage s'il est vide.
- [ ] Un résultat individuel peut être ajouté, modifié ou supprimé hors de la grille.
- [ ] La liste des résultats d'une classe reste consultable et à jour après chaque saisie.

## Bloquée par

Aucune — démarrable immédiatement.

---

## Phase 2 : L'agent consulte les résultats (et les observations) avant de générer un bulletin

**User stories** : PRD US-7, US-8

### Ce qu'on livre

Quand l'enseignant demande à l'agent un commentaire de bulletin, l'agent consulte automatiquement les résultats d'évaluation de l'élève dans la classe concernée, ainsi que ses observations déjà notées, et s'en sert pour rédiger le commentaire. Si aucune des deux sources n'existe pour cet élève, l'agent le signale clairement au lieu de générer un contenu générique.

### Critères d'acceptation

- [ ] Un élève avec des résultats et/ou des observations → commentaire généré qui reflète des éléments réels de ces données.
- [ ] Un élève sans aucun résultat ni observation → message de blocage clair, aucune génération, quota non débité.
- [ ] Un élève avec des résultats mais aucune observation (ou l'inverse) → génération normale, pas de blocage.
- [ ] Ce nouveau garde-fou s'ajoute à celui déjà existant sur le modèle de document, sans le remplacer — les deux peuvent bloquer indépendamment.

## Bloquée par

- Phase 1 (il faut pouvoir saisir des résultats pour les consulter).

---

## Notes

- Fast-follow hors de ce plan : dicter un résultat à l'agent en langage libre, une fois le chantier "observation conversationnelle" livré (réutilise son mécanisme d'extraction).
