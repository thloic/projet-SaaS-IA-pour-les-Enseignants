# Audit état des lieux - EducAssist

Audit réalisé en lecture du code uniquement. Chaque statut ci-dessous est basé sur les fichiers et routes cités.

## 1. AUTH & ONBOARDING

### Statut global : 🟡 Partiel

- ✅ Google OAuth actif : le bouton Google appelle `supabase.auth.signInWithOAuth({ provider: 'google' })` avec redirection vers `/auth/callback`.
  - Preuves : `src/features/auth/components/LoginForm.tsx`, `src/app/auth/callback/route.ts`.
- ✅ Magic link actif : le formulaire email valide l'adresse puis appelle `supabase.auth.signInWithOtp`.
  - Preuves : `src/features/auth/components/LoginForm.tsx`, `src/features/auth/schemas/authSchema.ts`, `src/app/auth/callback/route.ts`.
- ✅ Protection des routes dashboard active : le middleware considère `/`, `/login`, `/register`, `/faq`, `/contact`, `/about`, `/share/*`, `/auth/callback` et `/api/*` comme publics, puis protège le reste et redirige vers `/onboarding` si le profil enseignant est incomplet.
  - Preuve : `src/middleware.ts`.
- ✅ Onboarding avec champs collectés : prénom, nom, pays/province, matières, niveaux, système de notation, langue, notes de style.
  - Preuves : `src/features/profile/schemas/profileSchema.ts`, `src/features/profile/components/OnboardingForm.tsx`.
- ✅ Stockage du profil : table `teacher_profiles` avec `user_id`, `first_name`, `last_name`, `country`, `subject`, `subjects`, `levels`, `grading_system`, `language`, `style_notes`.
  - Preuves : `src/features/profile/server/profile.actions.ts`, `supabase/migrations/001_teacher_profiles.sql`, `supabase/migrations/006_teacher_profile_subjects_grading.sql`, `supabase/migrations/008_grading_system_extend.sql`.
- ✅ Réutilisation du profil dans l'interface : le layout dashboard charge le profil, transforme la langue/identité via `profileToTeacherIdentity`, puis initialise la locale applicative.
  - Preuves : `src/app/(dashboard)/layout.tsx`, `src/features/profile/server/profile.ts`.
- 🟡 Réutilisation du profil dans les générations IA : le quiz utilise `grading_system`, la première valeur de `levels` et la matière sélectionnée. Les `style_notes` ne sont pas injectées dans le prompt quiz.
  - Preuves : `src/features/quiz/server/quiz.actions.ts`, `src/features/quiz/server/quizGeneration.service.ts`, `src/lib/prompts/quiz.ts`.

## 2. GÉNÉRATION IA

### Statut global : 🟡 Partiel

### Routes API présentes

- 🟡 `/api/generate` : retourne seulement `{ ok: true }`, pas d'appel LLM.
  - Preuve : `src/app/api/generate/route.ts`.
- 🟡 `/api/quiz` : retourne seulement `{ ok: true }`, pas d'appel LLM dans cette route.
  - Preuve : `src/app/api/quiz/route.ts`.
- 🟡 `/api/bulletin` : retourne seulement `{ ok: true }`, pas d'appel LLM.
  - Preuve : `src/app/api/bulletin/route.ts`.
- 🟡 `/api/export` : retourne seulement `{ ok: true }`, pas d'appel LLM.
  - Preuve : `src/app/api/export/route.ts`.
- 🟡 `/api/share` : retourne seulement `{ ok: true }`, pas d'appel LLM.
  - Preuve : `src/app/api/share/route.ts`.
- 🟡 `/api/billing/checkout` : retourne seulement `{ ok: true }`, pas d'appel LLM.
  - Preuve : `src/app/api/billing/checkout/route.ts`.
- 🟡 `/api/webhooks/stripe` : retourne seulement `{ ok: true }`, pas d'appel LLM.
  - Preuve : `src/app/api/webhooks/stripe/route.ts`.

### Appels LLM réels

- ✅ Appel Anthropic réel pour la génération de quiz via AI SDK : `generateText({ model: anthropic(...) })`.
  - Preuve : `src/features/quiz/server/quizGeneration.service.ts`.
- 🟡 Mode mock possible pour le quiz si `QUIZ_GENERATION_MODE === 'mock'`.
  - Preuve : `src/features/quiz/server/quizGeneration.service.ts`.
- ❌ Génération de cours : formulaire visuel avec `setTimeout`, redirection vers `/history`, pas d'appel LLM.
  - Preuves : `src/features/generation/components/CourseGenerationForm.tsx`, `src/app/api/generate/route.ts`, `src/lib/prompts/course.ts`.
- ❌ Bulletin : résultat issu de `mockComments`, pas d'appel LLM.
  - Preuves : `src/features/bulletin/components/BulletinGenerator.tsx`, `src/app/api/bulletin/route.ts`, `src/lib/prompts/bulletin.ts`.

### Centralisation IA

- 🟡 Un fichier `src/lib/llm/litellm.ts` existe, mais il expose seulement `baseUrl` et `apiKey` et n'est pas utilisé par le service quiz.
- 🟡 Le seul vrai appel LLM observé est dispersé dans `src/features/quiz/server/quizGeneration.service.ts`.
- ❌ Les prompts `course`, `bulletin` et `variant` retournent une chaîne vide.
  - Preuves : `src/lib/prompts/course.ts`, `src/lib/prompts/bulletin.ts`, `src/lib/prompts/variant.ts`.

### Validation Zod des outputs IA

- ✅ Quiz : sortie IA parsée JSON, normalisée et validée par `generatedQuizSchema`.
  - Preuves : `src/features/quiz/server/quizGeneration.service.ts`, `src/features/quiz/schemas/quizSchema.ts`.
- ❌ Cours et bulletin : schémas vides, pas de validation d'output IA réel.
  - Preuves : `src/features/generation/schemas/generationSchema.ts`, `src/features/bulletin/schemas/bulletinSchema.ts`.

### Streaming

- ❌ Aucun streaming IA réel trouvé dans `src` : pas de `streamText`, `ReadableStream` ou `text/event-stream`.
  - Preuve : recherche dans `src/app`, `src/features`, `src/lib`.

## 3. QCM / QUIZ

### Statut global : ✅ Fonctionnel

- ✅ Formulaire : choix document source ou texte collé, matière, nombre de questions.
  - Preuves : `src/app/(dashboard)/quiz/page.tsx`, `src/features/quiz/components/QuizGeneratorForm.tsx`, `src/features/quiz/schemas/quizSchema.ts`.
- ✅ Génération : server action `generateQuizAction`, vrai service Anthropic ou mock selon variable d'environnement.
  - Preuves : `src/features/quiz/server/quiz.actions.ts`, `src/features/quiz/server/quizGeneration.service.ts`.
- ✅ Stockage : insertion dans `quizzes` avec `source_document_id`, `title`, `subject`, `source_text_snapshot`, `grading_system`, `total_points`, `questions`.
  - Preuves : `src/features/quiz/server/quiz.actions.ts`, `supabase/migrations/009_quizzes.sql`, `supabase/migrations/010_quizzes_subject.sql`.
- ✅ Consultation liste et détail : `listMyQuizzes`, `getMyQuiz`, pages `/quiz` et `/quiz/[id]`.
  - Preuves : `src/features/quiz/server/quiz.ts`, `src/app/(dashboard)/quiz/page.tsx`, `src/app/(dashboard)/quiz/[id]/page.tsx`.
- ✅ Édition : `updateQuizAction` valide le JSON modifié avec `quizUpdateSchema` puis met à jour `quizzes`.
  - Preuves : `src/features/quiz/server/quiz.actions.ts`, `src/features/quiz/components/QuizViewer.tsx`.
- ✅ Suppression : `deleteQuizAction` supprime par `id` et `user_id`.
  - Preuves : `src/features/quiz/server/quiz.actions.ts`, `src/features/quiz/components/QuizActions.tsx`.
- ✅ Export PDF spécifique quiz : bouton PDF qui ouvre une fenêtre imprimable et déclenche `print()`.
  - Preuves : `src/features/quiz/components/QuizActions.tsx`, `src/features/quiz/utils/exportQuizPdf.ts`.
- 🟡 Partage : bouton partage fonctionnel côté navigateur, mais il partage l'URL privée `/quiz/:id`, pas un lien public tokenisé.
  - Preuve : `src/features/quiz/components/QuizActions.tsx`.
- ✅ Source de génération : document uploadé via `source_documents.content_text` ou texte collé, avec profil enseignant pour système de notation et niveau.
  - Preuves : `src/features/quiz/server/quiz.actions.ts`, `src/lib/prompts/quiz.ts`.

## 4. DOCUMENTS SOURCES

### Statut global : ✅ Fonctionnel

- ✅ Upload/ajout : fichiers `.txt`, `.pdf`, `.docx` acceptés, ou contenu texte.
  - Preuves : `src/features/documents/components/DocumentsManager.tsx`, `src/features/documents/server/document.actions.ts`, `src/features/documents/schemas/documentSchema.ts`.
- ✅ Extraction/parsing : texte direct pour `.txt`, extraction PDF via `unpdf`, extraction DOCX via `mammoth`, limite à 20 000 caractères.
  - Preuve : `src/features/documents/server/document.actions.ts`.
- ✅ Stockage : table `source_documents` avec `title`, `content_text`, `source_type`, `original_filename`, `file_type`; pas de preuve d'utilisation de Supabase Storage pour les binaires.
  - Preuves : `src/features/documents/server/document.actions.ts`, `src/features/documents/server/document.ts`, `supabase/migrations/002_source_documents.sql`.
- ✅ Utilisation réelle en génération quiz : `generateQuizAction` lit `source_documents.content_text` puis l'injecte dans `generateQuizFromContent`.
  - Preuve : `src/features/quiz/server/quiz.actions.ts`.
- 🟡 Limite connue côté code : PDF scanné/image non pris en charge, message indiquant que l'OCR n'est pas encore pris en charge.
  - Preuve : `src/features/documents/server/document.actions.ts`.

## 5. GESTION DE CLASSE (fiche 29)

### Statut global : 🟡 Partiel

### Tables existantes

- ✅ `classes` : `id`, `user_id`, `name`, `level`, `subject`, `created_at`, `updated_at`.
  - Preuve : `supabase/migrations/002_classroom_module.sql`.
- ✅ `student_profiles` : `id`, `user_id`, `first_name`, `last_name`, `sex`, `needs`, `language`, `family_language`, `intervention_plan`, `general_notes`, dates.
  - Preuves : `supabase/migrations/002_classroom_module.sql`, `supabase/migrations/003_student_sex.sql`, `supabase/migrations/005_student_profile_dossier.sql`.
- ✅ `class_students` : lien classe/élève avec contrainte d'unicité.
  - Preuve : `supabase/migrations/002_classroom_module.sql`.
- ✅ `class_sessions` : séance par classe avec date, début, fin.
  - Preuve : `supabase/migrations/002_classroom_module.sql`.
- ✅ `attendance_records` : présence par séance/élève avec statut `present`, `absent`, `late`, `excused`.
  - Preuve : `supabase/migrations/002_classroom_module.sql`.
- ✅ `participation_events` : événements de participation avec valeur `-1`, `1`, `2`.
  - Preuve : `supabase/migrations/002_classroom_module.sql`.
- ✅ `student_observations` : observations par séance/élève avec catégorie, tag, note.
  - Preuve : `supabase/migrations/002_classroom_module.sql`.
- ❌ Table de notes/bulletins de classe non trouvée dans les migrations.
  - Preuve : dossier `supabase/migrations/`.

### Écrans et données

- ✅ Page `/classroom` : liste, création, modification et suppression de classes avec Supabase client.
  - Preuves : `src/app/(dashboard)/classroom/page.tsx`, `src/features/classroom/components/ClassroomHome.tsx`.
- ✅ Page `/classroom/[classId]` : chargement de la classe, élèves liés, ajout, édition, suppression, recherche et import CSV côté composant.
  - Preuves : `src/app/(dashboard)/classroom/[classId]/page.tsx`, `src/features/classroom/components/ClassDetail.tsx`.
- ✅ Page `/classroom/[classId]/session` : création/récupération d'une séance active, présences, participation et observations.
  - Preuves : `src/app/(dashboard)/classroom/[classId]/session/page.tsx`, `src/features/classroom/components/ClassSessionPage.tsx`.
- 🟡 Implémentation majoritairement côté client : les opérations classe/élève/séance utilisent `createClient()` Supabase dans les composants client, pas des server actions dédiées.
  - Preuves : `src/features/classroom/components/ClassroomHome.tsx`, `src/features/classroom/components/ClassDetail.tsx`, `src/features/classroom/components/ClassSessionPage.tsx`.

### RLS

- ✅ RLS activé sur `classes`, `student_profiles`, `class_students`, `class_sessions`, `attendance_records`, `participation_events`, `student_observations`.
  - Preuve : `supabase/migrations/002_classroom_module.sql`.
- ✅ Politiques `*_own_all` présentes pour chaque table de classe listée ci-dessus.
  - Preuve : `supabase/migrations/002_classroom_module.sql`.

## 6. MONÉTISATION

### Statut global : ❌ Absent

- ❌ Compteur de générations réel absent : `GenerationCounter` retourne un placeholder, `profileToTeacherIdentity` met `generationsUsed` à `0` et `generationsLimit` à `3` par défaut.
  - Preuves : `src/components/shared/GenerationCounter.tsx`, `src/features/profile/server/profile.ts`.
- 🟡 Affichage compteur dans la sidebar, mais basé sur les valeurs de l'objet `teacher`, sans preuve d'incrémentation persistée.
  - Preuve : `src/components/shared/Sidebar.tsx`.
- ❌ Incrémentation serveur non trouvée.
  - Preuves : `src/features/quiz/server/quiz.actions.ts`, recherche `generation_count`, `generations_used`, `usage`.
- ❌ Blocage serveur à 3 générations non trouvé.
  - Preuve : `src/features/quiz/server/quiz.actions.ts`.
- 🟡 Blocage client fictif dans la génération de cours : `generationsUsed = 2`, `generationsLimit = 3`.
  - Preuve : `src/features/generation/components/CourseGenerationForm.tsx`.
- ❌ Stripe checkout non implémenté : route placeholder `{ ok: true }`.
  - Preuve : `src/app/api/billing/checkout/route.ts`.
- ❌ Webhook Stripe non implémenté : route placeholder `{ ok: true }`.
  - Preuve : `src/app/api/webhooks/stripe/route.ts`.
- ❌ Table `subscriptions` non trouvée dans les migrations.
  - Preuve : dossier `supabase/migrations/`.
- 🟡 Dépendances et variables Stripe présentes.
  - Preuves : `package.json`, `.env.example`.

## 7. EXPORTS

### Statut global : 🟡 Partiel

- ✅ Export PDF quiz : export imprimable via `window.open`, HTML généré, puis `print()`.
  - Preuves : `src/features/quiz/utils/exportQuizPdf.ts`, `src/features/quiz/components/QuizActions.tsx`.
- ❌ Export PDF générique absent : `buildPdf()` retourne `null`, route `/api/export` retourne `{ ok: true }`.
  - Preuves : `src/features/export/utils/buildPdf.ts`, `src/app/api/export/route.ts`.
- ❌ Export DOCX absent : `buildDocx()` retourne `null`.
  - Preuve : `src/features/export/utils/buildDocx.ts`.
- ❌ Partage par lien public absent : page `/share/[token]` affiche un placeholder, route `/api/share` retourne `{ ok: true }`.
  - Preuves : `src/app/share/[token]/page.tsx`, `src/features/share/components/PublicSharePage.tsx`, `src/app/api/share/route.ts`.
- 🟡 Bouton de partage quiz présent, mais il partage/copier l'URL privée `/quiz/:id`.
  - Preuve : `src/features/quiz/components/QuizActions.tsx`.

## 8. FEATURES ABSENTES

### Statut global : 🟡 Partiel

- ❌ Variantes de différenciation : pas de module fonctionnel trouvé, prompt vide.
  - Preuve : `src/lib/prompts/variant.ts`.
- 🟡 Bulletins : interface présente avec mock local, pas de génération IA ni stockage.
  - Preuves : `src/features/bulletin/components/BulletinGenerator.tsx`, `src/app/api/bulletin/route.ts`, `src/features/bulletin/schemas/bulletinSchema.ts`.
- ❌ Communication parents : pas de module, route ou table dédiée trouvée.
  - Preuve : liste des fichiers `src/features`, `src/app`, `supabase/migrations/`.
- ❌ Correction de copies : pas de module, route ou table dédiée trouvée.
  - Preuve : liste des fichiers `src/features`, `src/app`, `supabase/migrations/`.
- ❌ Calendrier / alignement programme : pas de module, route ou table dédiée trouvée.
  - Preuve : liste des fichiers `src/features`, `src/app`, `supabase/migrations/`.
- ❌ Bibliothèque : pas de module, route ou table dédiée trouvée.
  - Preuve : liste des fichiers `src/features`, `src/app`, `supabase/migrations/`.
- 🟡 Génération de cours : formulaire présent, mais pas de génération IA réelle ni stockage.
  - Preuves : `src/features/generation/components/CourseGenerationForm.tsx`, `src/app/api/generate/route.ts`, `src/lib/prompts/course.ts`.

## 9. DETTE & RISQUES

### Statut global : 🟡 Partiel

- 🟡 Erreurs techniques exposées : plusieurs erreurs sont journalisées en console avec détails techniques, tandis que les messages utilisateur sont généralement simplifiés en français. À vérifier en exécution pour identifier les cas visibles côté frontend.
  - Preuves : `src/features/quiz/server/quiz.actions.ts`, `src/features/documents/server/document.actions.ts`, `src/features/profile/server/profile.actions.ts`, `src/features/classroom/components/ClassroomHome.tsx`, `src/features/classroom/components/ClassDetail.tsx`, `src/features/classroom/components/ClassSessionPage.tsx`.
- ✅ Secrets publics/privés dans l'exemple d'environnement : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY` ne sont pas préfixés `NEXT_PUBLIC_`; les clés publiques Supabase, Stripe publishable, PostHog et app URL sont préfixées `NEXT_PUBLIC_`.
  - Preuve : `.env.example`.
- ✅ RLS présent pour les tables principales inspectées : `teacher_profiles`, `source_documents`, tables classroom, `quizzes`.
  - Preuves : `supabase/migrations/001_teacher_profiles.sql`, `supabase/migrations/002_source_documents.sql`, `supabase/migrations/002_classroom_module.sql`, `supabase/migrations/009_quizzes.sql`.
- 🟡 Données en dur dans des composants censés représenter des fonctionnalités produit :
  - Dashboard : statistiques `12`, `34`, `6h` codées en dur.
    - Preuve : `src/app/(dashboard)/dashboard/DashboardContent.tsx`.
  - Génération de cours : quota `2/3`, listes de matières/niveaux/durations en dur, simulation par `setTimeout`.
    - Preuve : `src/features/generation/components/CourseGenerationForm.tsx`.
  - Bulletin : `mockComments` et simulation par `setTimeout`.
    - Preuve : `src/features/bulletin/components/BulletinGenerator.tsx`.
  - Billing : `GenerationCounter`, `UpgradeModal`, `useBilling` placeholders.
    - Preuves : `src/components/shared/GenerationCounter.tsx`, `src/features/billing/components/UpgradeModal.tsx`, `src/features/billing/hooks/useBilling.ts`.
- 🟡 Routes API placeholders exposées : `/api/generate`, `/api/quiz`, `/api/bulletin`, `/api/export`, `/api/share`, `/api/billing/checkout`, `/api/webhooks/stripe`.
  - Preuves : `src/app/api/generate/route.ts`, `src/app/api/quiz/route.ts`, `src/app/api/bulletin/route.ts`, `src/app/api/export/route.ts`, `src/app/api/share/route.ts`, `src/app/api/billing/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`.
