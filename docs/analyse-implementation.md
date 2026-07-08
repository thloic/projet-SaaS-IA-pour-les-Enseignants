# Analyse d'implementation EducAssist

Date d'analyse : 2026-07-08

Ce document compare le cahier des charges `docs/cahier-des-charges.md` avec l'etat actuel du code. Les statuts ci-dessous distinguent :

- **Implemente** : parcours utilisable avec persistance ou logique metier reelle.
- **Partiel** : interface, schema ou socle present, mais moteur/metier incomplet.
- **Non implemente** : absent, placeholder, ou seulement mentionne dans l'interface.

## Synthese globale

Le projet dispose d'un socle Next.js/Supabase solide : authentification, shell dashboard, onboarding profil, documents source, pages publiques, debut de classroom/dossier eleve, migrations RLS, theme, navigation et quelques formulaires. En revanche, les moteurs IA principaux du cahier des charges sont encore majoritairement des placeholders : routes API `generate`, `quiz`, `bulletin`, `export`, `billing` et `share` retournent seulement `{ ok: true }`, et les builders de prompts/export sont vides.

Le module le plus avance fonctionnellement est actuellement **Documents source** et le debut du **Module 5 / classroom**. Le module IA zero-prompt, le streaming LLM, les exports PDF/DOCX et le freemium gate restent a brancher pour atteindre les priorites MVP annoncees dans `AGENTS.md`.

## Fonctionnalites deja implementees ou partielles

| # | Fonctionnalite cahier des charges | Statut | Evidence code | Analyse |
|---|---|---|---|---|
| 1 | Setup infrastructure projet | Partiel | `package.json`, `next.config.ts`, `src/lib/supabase/*`, migrations Supabase | Projet Next.js 16, Supabase client/server/middleware, Tailwind/shadcn. Le deploiement Vercel/GitHub existe probablement hors repo, mais non verifiable dans le code. |
| 2 | Authentification & inscription | Implemente | `src/features/auth/components/LoginForm.tsx`, `src/app/auth/callback/route.ts`, `src/middleware.ts` | Connexion Google et magic link, callback Supabase, erreurs auth normalisees, routes dashboard protegees par middleware. |
| 3 | Onboarding profil enseignant | Implemente avec point DB a finaliser | `src/features/profile/components/OnboardingForm.tsx`, `src/features/profile/schemas/profileSchema.ts`, `supabase/migrations/001_*`, `006_*`, `007_*` | Formulaire multi-etapes, validation Zod, upsert Supabase, fallback si la colonne live `subjects` manque. La migration 007 doit etre appliquee sur Supabase pour persister proprement les matieres multiples. |
| 4 | Tableau de bord principal | Partiel | `src/app/(dashboard)/dashboard/DashboardContent.tsx`, `src/components/shared/DashboardShell.tsx` | Dashboard responsive avec navigation, actions rapides et statistiques. Les stats/historique sont encore statiques, non connectes aux generations reelles. |
| 5 | Upload/saisie document source | Implemente | `src/features/documents/*`, `supabase/migrations/002_source_documents.sql`, `004_source_documents_file_type.sql` | Saisie texte, import `.txt`, `.pdf`, `.docx`, extraction texte, limites de taille, sauvegarde Supabase, liste, consultation et suppression. Pas d'OCR, conforme au cahier pour cette etape. |
| 6 | Generation des 5 variantes | Non implemente | `src/lib/prompts/variant.ts` retourne `''` | Le document source existe, mais aucun moteur de variantes Standard/Soutien/DYS/TDAH/Enrichissement n'est branche. |
| 7 | Export PDF & DOCX | Non implemente | `src/features/export/utils/buildPdf.ts`, `buildDocx.ts`, `src/app/api/export/route.ts` | Les fonctions retournent `null` et l'API retourne `{ ok: true }`. Boutons/UI possibles, mais pas de generation de fichiers. |
| 8 | Profil eleve persistant | Partiel avance | `src/features/classroom/components/ClassDetail.tsx`, `supabase/migrations/002_classroom_module.sql`, `005_student_profile_dossier.sql` | Classes et eleves persistent dans Supabase, avec sexe, langue familiale, besoins, plan d'intervention, notes. C'est une base de dossier eleve, mais elle n'est pas encore connectee aux generations/adaptations IA. |
| 9 | Banque ressources adaptees + partage | Non implemente | `src/features/share/components/PublicSharePage.tsx`, `src/app/api/share/route.ts` | Page publique placeholder et API `{ ok: true }`. Pas de modele de ressources adaptees ni liens reels. |
| 10 | Generation sequence pedagogique | Partiel UI seulement | `src/features/generation/components/CourseGenerationForm.tsx`, `src/app/api/generate/route.ts` | Formulaire riche present, mais submit simule une attente puis redirige. Pas de prompt, pas de LLM, pas de persistence de generation. |
| 11 | Messages parents par etiquettes | Non implemente | Aucun module parent communication metier | Le dashboard mentionne des bulletins/messages, mais pas de generateur parent par etiquettes. |
| 12 | Traduction automatique messages | Non implemente | Aucun service traduction | Absent. |
| 13 | Portail communication centralise | Non implemente | Aucun schema communication | Absent. |
| 14 | Import copies multi-format texte numerique | Non implemente | Documents source reutilisables mais pas module copies | L'extraction de documents existe, mais pas de modele/parcours de copies a corriger. |
| 15 | Commentaires personnalises par eleve | Partiel UI bulletin | `src/features/bulletin/*`, `src/app/api/bulletin/route.ts` | Formulaires/resultat existent, mais schema et API sont placeholders. Pas de generation reelle basee sur erreurs. |
| 16 | Detection/classification erreurs | Non implemente | Aucun moteur correction | Absent. |
| 17 | Tableau recapitulatif classe | Non implemente | Classroom sans agregats notes/copies | Absent cote correction. |
| 18 | Memoire pedagogique | Partiel minimal | `teacher_profiles.style_notes` | Notes de style enseignant stockees, mais pas de memoire d'exemples valides ni reutilisation dans prompts. |
| 19 | Freemium + Stripe | Partiel scaffold | `src/components/shared/GenerationCounter.tsx`, `src/features/billing/*`, `src/app/api/billing/checkout/route.ts` | Compteur/plan visibles dans UI, mais valeurs souvent statiques, checkout route placeholder, pas de gate serveur fiable ni reset mensuel. |
| 20 | Parrainage | Non implemente | Aucun schema/referral | Absent. |
| 21 | 4 paliers abonnement | Non implemente | `UpgradeModal` placeholder | Absent hors affichage "Plan Free/Pro". |
| 22 | Alignement curriculaire | Non implemente | Aucun schema curriculum | Absent. |
| 23 | Remplissage grilles competences | Non implemente | Aucun referentiel competences | Absent. |
| 24 | Calendrier pedagogique | Non implemente | Aucun calendrier | Absent. |
| 25 | Notification changement programme | Non implemente | Aucun systeme notification curriculum | Absent. |
| 26 | OCR manuscrit | Non implemente volontairement | Documents refuse les PDFs scannes | Non prevu a ce stade, conforme a la vigilance du cahier. |
| 27 | Envoi reel + accuses lecture | Non implemente | Contact utilise Resend pour equipe, pas parents | Pas de canal parent, pas d'accuse lecture. |
| 28 | Alertes proactives | Non implemente | Aucun worker/surveillance | Absent. |
| 29 | Saisie presences/participation/observations | Partiel | `src/features/classroom/components/ClassSessionPage.tsx`, `ClassDetail.tsx` | Le module classroom existe, mais il faut verifier/renforcer la persistance complete des sessions, participation et observations. UX web mobile amorcee. |
| 30 | Synchronisation bulletin | Non implemente | Aucun lien classroom -> bulletin | Absent. |
| 31 | Analytics classe + groupes | Non implemente | Aucun agregat engagement | Absent. |
| 32 | Vue 360 eleve | Partiel fondation | `ClassDetail.tsx` dossier eleve | Dossier eleve amorce, mais pas d'agregation notes/comms/comportement/modules. |
| 33 | Bibliotheque collaborative | Non implemente | Aucun schema bibliotheque | Absent. |
| 34 | Integrations LMS | Non implemente | Aucun connecteur LMS | Absent. |

## Analyse par priorites MVP

### 1. Formulaire generation zero-prompt

**Etat : partiel.** Le formulaire de cours existe et guide bien l'utilisateur, mais il ne produit pas encore de requete metier vers un moteur IA. Les schemas `generationSchema`, `quizSchema` et `bulletinSchema` sont vides.

### 2. Streaming LLM + affichage

**Etat : non implemente.** `src/lib/llm/litellm.ts` lit seulement les variables d'environnement. Les routes API de generation retournent `{ ok: true }`; aucun streaming, aucun appel LiteLLM/Claude, aucun affichage progressif reel.

### 3. Export PDF/DOCX

**Etat : non implemente.** Les fichiers `buildPdf.ts` et `buildDocx.ts` retournent `null`; la route API export est un placeholder.

### 4. Freemium gate 3 generations max

**Etat : partiel UI.** La sidebar et le formulaire de generation affichent un compteur, mais il est statique ou issu du profil. Il manque la table/compteur de generations, la verification serveur, le blocage robuste et le reset mensuel.

## Tests unitaires ajoutes

Un script `npm run test:unit` a ete ajoute sans dependance externe. Il utilise le runner natif de Node :

```bash
npm run test:unit
```

Couverture ajoutee dans `tests/unit/core-functions.test.ts` :

- validation email magic link ;
- mapping des erreurs auth Supabase ;
- schema profil onboarding ;
- normalisation du systeme de notation ;
- detection de l'erreur Supabase `teacher_profiles.subjects` manquante ;
- schemas classroom : classe, eleve, observation ;
- schema documents source ;
- schema contact ;
- helper `cn` ;
- client LiteLLM ;
- placeholders de prompts ;
- placeholders d'export PDF/DOCX.

Limite volontaire : les composants React, actions Supabase et routes API necessitent des tests d'integration avec mocks ou environnement Supabase. Les tests unitaires actuels se concentrent sur les fonctions pures et contrats de validation.

## Risques techniques actuels

- La base Supabase live doit appliquer la migration `007_teacher_profiles_subjects_live_repair.sql`; sinon le fallback sauvegarde le profil mais les matieres multiples ne sont pas persistees dans `subjects`.
- Les routes API placeholder peuvent donner une fausse impression de fonctionnalite terminee.
- Plusieurs statistiques dashboard/historique sont statiques.
- Le code met encore de la logique temporaire dans `app/api/*`; l'instruction projet demande de garder la logique metier dans `features/`.
- Les tests unitaires documentent l'existant, mais ne remplacent pas des tests d'integration Supabase/RLS.
