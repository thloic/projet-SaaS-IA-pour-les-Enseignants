# Plan technique — Fin d'onboarding vers la classe + mini-tutoriel modal

> Objectif produit (décidé avec le développeur) : à la fin de l'onboarding, ne pas renvoyer l'enseignant vers un tableau de bord vide — le pousser directement à créer sa première classe (là où le modèle de document, texte ou PDF, est déjà configurable). En complément, un mini-tutoriel modal (4-5 étapes) montre ce flux à la première connexion.
> Destiné à l'agent qui implémente. Pas de nouveau concept de "modèle" — on réutilise tel quel ce qui existe déjà dans les classes (Phases 1-4 déjà livrées).

## Étape 0 — Vérifications avant de commencer

- Confirmer le prochain numéro de migration (`ls supabase/migrations/ | sort -V | tail`) — au moment de ce plan, la dernière était `026_evaluation_results.sql` (un autre chantier concurrent), donc re-vérifier avant de nommer la nouvelle.
- Relire `src/features/profile/components/OnboardingForm.tsx` (redirection actuelle : `router.push('/dashboard')` après succès) et `src/features/classroom/components/ClassroomHome.tsx` (l'état vide « Créez votre première classe » existe déjà — pas à recréer).
- Aucun mécanisme de tutoriel/tour n'existe dans le projet aujourd'hui (vérifié) — première introduction de ce concept.

---

## Étape 1 — Migration : mémoriser si le tutoriel a été vu

Nouvelle colonne sur `teacher_profiles` :

```sql
alter table public.teacher_profiles
  add column if not exists onboarding_tour_seen boolean not null default false;

notify pgrst, 'reload schema';
```

Choix DB plutôt que `localStorage` : l'enseignant ne doit pas revoir le tutoriel s'il se connecte depuis un autre appareil.

---

## Étape 2 — Rediriger vers la classe plutôt que le tableau de bord

- `src/features/profile/components/OnboardingForm.tsx` : remplacer `router.push('/dashboard')` (succès de l'onboarding) par `router.push('/classroom')`.
- Rien d'autre à changer sur `/classroom` : une classe inexistante affiche déjà l'état vide « Créez votre première classe » (`ClassroomHome.tsx`). C'est ce qui sert de première étape concrète.
- Vérifier que le champ modèle de document (texte) est bien visible dès la création (déjà le cas) ; le PDF reste réservé à l'édition post-création (limite déjà connue, non traitée dans ce lot — noter si le développeur veut la lever plus tard).

---

## Étape 3 — Composant tutoriel modal

Nouveau composant `src/features/onboarding/components/OnboardingTour.tsx` (nouveau dossier `src/features/onboarding/` si absent, sinon `src/features/profile/components/`) :

- Modal en 4-5 étapes, navigation « Suivant / Précédent / Passer », fermeture possible à tout moment.
- Contenu proposé (à ajuster librement) :
  1. Bienvenue — présentation en une phrase de l'app.
  2. Créez votre classe et vos élèves.
  3. Ajoutez le modèle de document de votre établissement (texte ou PDF) — c'est ce que l'agent utilisera.
  4. Posez vos questions à l'agent — il génère PAT et commentaires de bulletin à partir de ce que vous avez configuré.
  5. C'est parti — bouton qui ferme le tutoriel et marque `onboarding_tour_seen = true`.
- Un seul appel serveur à la fermeture (passer ou terminer) — pas d'écriture à chaque étape intermédiaire.
- Pas de nouvelle dépendance : composants shadcn/ui existants (`Button`, structure de modal déjà utilisée ailleurs dans le projet, ex. le dialogue de classe dans `ClassroomHome.tsx`) ; GSAP uniquement si une transition d'étape est jugée nécessaire, sinon CSS simple suffit.

Déclenchement : afficher le composant depuis le layout du dashboard (ou la page `/classroom`) si `teacher_profiles.onboarding_tour_seen === false`, une fois le profil chargé côté serveur.

---

## Étape 4 — Action serveur pour marquer le tutoriel comme vu

- Nouvelle fonction dans `src/features/profile/server/profile.ts` (ou fichier équivalent déjà existant pour les mutations de profil) : `markOnboardingTourSeenAction()` — `update teacher_profiles set onboarding_tour_seen = true where user_id = ...`, aucune validation de payload nécessaire (pas d'input).
- Appelée par `OnboardingTour.tsx` à la fermeture (bouton "Passer" ou dernière étape).

---

## Étape 5 — Vérifications avant de considérer le lot terminé

- `npx tsc --noEmit`, `npx eslint` sur les fichiers touchés.
- Test manuel : créer un compte de test, terminer l'onboarding → doit atterrir sur `/classroom` avec le tutoriel affiché ; le fermer → ne doit plus réapparaître à la reconnexion.
- Aucun test unitaire attendu ici (composant UI + redirection, pas de logique pure à isoler) — sauf si `markOnboardingTourSeenAction` justifie un test si un pattern de test existe déjà pour des actions serveur similaires (vérifier avant d'en ajouter un pour la première fois).

---

## Hors périmètre

- Tutoriel contextuel avancé (surbrillance d'éléments réels de l'interface, type "product tour" avec bibliothèque dédiée) — ce lot reste un simple modal informatif.
- Téléversement du PDF dès l'étape de création de classe (actuellement réservé à l'édition) — non traité ici.
- Personnalisation du contenu du tutoriel selon le profil (primaire vs secondaire, pays) — même contenu pour tous en V1.
