# Fonctions restantes a implementer

Ce dossier liste les fonctions du cahier des charges qui ne sont pas implementees ou qui restent partielles. Le terme "restant" inclut aussi les placeholders et les interfaces non branchees a une logique metier reelle.

> **Mise a jour (audit + implementation du 2026-07-24)** : la section "Priorite MVP immediate" a ete corrigee apres verification ligne par ligne du code. Le moteur de generation zero-prompt, le streaming et le freemium gate sont en realite deja largement implementes — seule l'UI de paywall reste a faire. L'export PDF/DOCX (`@react-pdf/renderer` + `docx`) a ete implemente le meme jour et retire de cette liste ; il beneficie aux cours generes et aux variantes d'adaptation. La section "Module 2 - Adapte Lecon" a egalement ete retiree : le module `src/features/adaptation/*`, decouvert en cours de session, la couvrait deja entierement (5 variantes, banque, reutilisation, partage securise). Voir aussi la note "Derives constatees" en bas de fichier.

## Priorite MVP immediate

1. **UI d'upgrade / paywall — backend pret, interface manquante**
   - Le comptage de generations est deja fonctionnel : table `usage_counters` (`supabase/migrations/011_usage_counters.sql`), fonctions SQL atomiques `increment_usage`/`decrement_usage`, limite serveur `FREE_GENERATION_LIMIT = 3` (`src/features/billing/server/usage.ts`), reset mensuel implicite via la cle `user_id + period`, UI des parametres deja connectee aux vraies donnees (`src/app/(dashboard)/settings/page.tsx`).
   - Ce qui manque : `UpgradeModal.tsx` et `useBilling.ts` (`src/features/billing/`) sont des stubs morts — il n'y a pas de vrai CTA/parcours de paiement declenche par la limite atteinte.

2. **Nettoyage technique mineur — moteur de generation**
   - Le moteur de generation zero-prompt (schema, `buildCoursePrompt`, appel Claude via `streamText`/`@ai-sdk/anthropic`, persistance en base, streaming server-side, affichage progressif, annulation/retry) est **deja implemente et fonctionnel**, dans `src/app/api/course/generate/route.ts` + `src/features/generation/*` + `src/lib/prompts/course.ts`. Ne pas refaire ce travail.
   - Reste a nettoyer : `GenerationViewer.tsx` et `useGeneration.ts` (`src/features/generation/`) sont des stubs morts inutilises — la logique reelle vit dans `CourseGenerationForm.tsx`. A supprimer ou a brancher pour eviter la confusion.
   - `src/app/api/generate/route.ts` (a ne pas confondre avec `src/app/api/course/generate/route.ts`) est un stub mort a supprimer si non utilise.
   - Le generateur de markdown mock et l'orchestration du stream restent inline dans la route plutot que dans `features/` — ecart mineur, pas bloquant.

## Module 1 - Correction IA

- Import de copies dedie au module correction.
- Analyse de copie.
- Detection et classification d'erreurs.
- Commentaires personnalises par eleve avec 3 tons.
- Grilles de competences officielles.
- Tableau recapitulatif de classe par objectifs.
- Historique des corrections validees.

## Module 3 - Communication parents

- Generateur de messages parents par etiquettes.
- Modeles reutilisables par situation.
- Ton configurable.
- Traduction automatique dans la langue parent.
- Historique des communications par eleve.
- Export PDF du dossier communication.
- Envoi reel email/SMS/portail.
- Accuses de lecture.
- Suivi des reponses.
- Alertes proactives sur patterns preoccupants.

## Module 4 - Planification Pro

- Base curriculaire officielle.
- Structure pays/province/niveau/matiere/competences.
- Alignement automatique des sequences sur curriculum.
- Calendrier pedagogique local.
- Alertes de retard de couverture.
- Notification de changement de programme apres mise a jour manuelle de la base.
- Bibliotheque de sequences collaboratives.

## Module 5 - Tableau / Classroom

> Deja implemente (verifie au code) : persistance complete des sessions (tables `classes`, `student_profiles`, `class_students`, `class_sessions`, `attendance_records`, `participation_events`, `student_observations`, toutes RLS, lecture/ecriture reelle dans `ClassSessionPage.tsx`), saisie presence mobile en un tap, participation en un geste (3 boutons). Observations rapides existent mais sous forme de tags textuels, pas d'icones — a ameliorer plutot qu'a construire.

- Passer les observations rapides de tags textuels a des icones.
- Aggregation participation/comportement par eleve au-dela de la session en cours (seule l'aggregation intra-session existe aujourd'hui).
- Synchronisation des faits vers le bulletin (aucun lien aujourd'hui entre `features/bulletin` et les tables classroom).
- Analytics hebdomadaires/mensuels d'engagement.
- Suggestion de groupes de travail.
- Vue 360 eleve regroupant notes, comportements, communications, adaptations et plan d'intervention (la fiche eleve actuelle n'affiche que les champs de profil, pas ces donnees agregees).

## Monetisation et croissance

- Checkout Stripe reel.
- Webhooks Stripe complets.
- Etats d'abonnement.
- 4 paliers Starter/Pro/Etablissement/District.
- Gestion organisations pour Etablissement/District.
- Parrainage avec lien unique.
- Attribution automatique d'un mois offert.

## Integrations et partage

- Generation de liens de partage reels.
- Permissions et expiration des liens.
- Integrations LMS : Google Classroom, Teams, Moodle, Mozaik.
- Choisir une integration prioritaire avant tout developpement.

## Technique transverse

- Sortir la logique metier restante de `app/api/*` vers `features/*` (en pratique, seule la route `course/generate` garde encore de la logique inline ; les autres routes API sont des stubs morts et le reste du code deja ecrit — bulletin, quiz, profil, contact — est deja bien range sous `features/*/server/`).
- Ajouter tests d'integration Supabase avec RLS (aucun aujourd'hui, seul `tests/unit/core-functions.test.ts` existe et ne teste que des fonctions pures).
- Ajouter tests composants pour onboarding, documents, classroom (aucune librairie de test composant installee).
- Confirmer l'application de la migration Supabase `007_teacher_profiles_subjects_live_repair.sql` sur la base live : le fichier existe dans le repo, mais `src/features/profile/utils/profileSaveError.ts` contient un fallback defensif pour l'erreur Postgres de colonne manquante, signe que l'equipe n'est pas certaine qu'elle ait ete appliquee en production. A verifier directement en base.
- Remplacer les donnees statiques dashboard/historique par des donnees persistantes : `dashboard`/`history` utilisent deja de vraies requetes Supabase pour les quiz, mais 3 des 4 tuiles de stats du dashboard (`DashboardContent.tsx`) sont encore codees en dur (`'12'`, `'34'`, `'6h'`).

## Derives constatees entre CLAUDE.md et le code reel

- Le modele de donnees decrit en `CLAUDE.md` §5 mentionne un champ `generations.share_token`. Ce champ/cette table n'existe dans aucune migration Supabase (`grep` sur `share_token` : zero resultat dans `src/` et `supabase/`). La fonctionnalite "liens de partage" (section Integrations et partage ci-dessus) part donc de zero, y compris sur le plan du schema.
