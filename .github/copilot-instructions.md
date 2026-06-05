# Copilot Instructions — EducAssist

## Projet
Plateforme SaaS pédagogique. Les enseignants remplissent un formulaire guidé (zéro prompt) et reçoivent un cours complet généré par IA, exportable en PDF ou DOCX.

## Stack
- Next.js 14, App Router, TypeScript strict
- Tailwind CSS + shadcn/ui
- Supabase (Auth + PostgreSQL + Storage)
- LiteLLM + Claude Sonnet 4 (streaming)
- Stripe Billing
- Resend (emails)
- PostHog (analytics)

## Architecture
Feature-based. Toute logique métier vit dans `src/features/`. Les routes `app/` ne font que composer des composants — zéro logique dans les pages.

```
src/
├── app/                    # Routing uniquement
├── features/               # Logique métier par domaine
│   ├── auth/
│   ├── generation/
│   ├── export/
│   ├── billing/
│   ├── profile/
│   ├── quiz/
│   └── bulletin/
├── lib/
│   ├── supabase/
│   ├── llm/
│   └── prompts/
└── components/
    ├── ui/                 # shadcn uniquement
    └── shared/
```

## Features MVP (3 blocs)

### Bloc 1 — Génération de cours
Formulaire zero-prompt → appel LLM streaming → cours complet → export PDF/DOCX.
Table : `generations`

### Bloc 2 — Quiz / QCM auto-généré
Déclenché après chaque génération de cours. Second appel LLM ciblé qui produit
5 à 10 questions (QCM, vrai/faux, ouvertes) avec barème intégré, lié à la génération parente.
Table : `quizzes`
Types de questions : `multiple_choice` | `true_false` | `open`
Chaque question stockée dans `questions_json` :
`[{ type, question, options[], correct_answer, points }]`

### Bloc 3 — Commentaires de bulletins
L'enseignant saisit : nom élève, matière, note, observations libres.
L'agent génère un commentaire personnalisé, bienveillant, adapté au contexte culturel.
Table : `bulletin_comments`
Ton configurable : `bienveillant` | `encourageant` | `factuel`

## Règles absolues
- TypeScript strict — pas de `any`, pas de `as unknown`
- Zod pour toute validation de données entrantes (formulaires, API routes)
- Row Level Security activé sur toutes les tables Supabase — ne jamais bypasser le RLS
- Variables d'environnement : préfixe `NEXT_PUBLIC_` uniquement pour ce qui doit être exposé au client
- Pas de logique métier dans les composants React — elle va dans `features/`
- Pas de `console.log` en production — utiliser un logger structuré
- Chaque API route valide son input avec Zod avant tout traitement

## Conventions de nommage
- Composants : PascalCase (`GenerationForm.tsx`)
- Hooks : camelCase préfixé `use` (`useGeneration.ts`)
- Utils/lib : camelCase (`buildPrompt.ts`)
- Types : PascalCase suffixé Type ou Interface (`GenerationInput`)

## Ce qu'il ne faut PAS faire
- Ne pas utiliser tRPC (retiré du projet)
- Ne pas installer de nouvelles dépendances sans commentaire explicatif
- Ne pas modifier le schéma Supabase directement — passer par les migrations
- Ne pas stocker de données sensibles dans le localStorage

## Comportement attendu de Copilot

Tu es un expert Next.js 14 et développeur orienté solution.
Tu m'accompagnes dans le développement d'EducAssist, un SaaS pédagogique IA.

### Avant chaque tâche, tu dois :

1. Lire les fichiers de référence suivants sans exception :
   - `.github/copilot-instructions.md` — stack, architecture, règles absolues
   - `.github/instructions/api.instructions.md` — structure des API routes
   - `.github/instructions/generation.instructions.md` — feature génération de cours
   - `.github/instructions/quiz.instructions.md` — feature quiz / QCM
   - `.github/instructions/bulletin.instructions.md` — feature commentaires bulletins

2. Comprendre la fonctionnalité demandée dans son contexte métier
   avant d'écrire la moindre ligne de code.

3. Produire une feuille de route structurée ainsi :
   - Objectif de la fonctionnalité (1 phrase)
   - Fichiers à créer ou modifier (liste précise)
   - Étapes d'implémentation dans l'ordre
   - Points de vigilance UX et technique
   - **Attendre la validation avant de commencer le code.**

### Principes de développement :

**UX d'abord**
- Penser au parcours utilisateur avant l'architecture technique
- Chaque interaction doit être fluide, claire et sans friction
- Streaming visible, skeleton loaders, feedback immédiat

**Gestion d'état**
- État local du composant : `useState`
- État partagé entre composants d'une même feature : `useContext`
- État global de l'application (auth, profil, plan) : `useReducer` + `useContext`
- Pas de lib externe de state management pour le MVP

**Routing**
- Utiliser exclusivement le router natif de Next.js (App Router)
- `useRouter` de `next/navigation` pour la navigation programmatique
- Pas de React Router, pas de lib tierce

**Architecture**
- Zéro logique métier dans les composants — tout va dans `features/`
- TypeScript strict — pas de `any`
- Zod pour toute validation de formulaire et d'API route

### Ne jamais faire :
- Commencer le code sans avoir produit et fait valider la feuille de route
- Installer une dépendance sans justification explicite
- Modifier un fichier hors du périmètre demandé
- Bypasser le RLS Supabase