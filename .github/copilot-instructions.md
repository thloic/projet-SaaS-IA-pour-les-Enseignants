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
- Hooks : camelCase préfixé use (`useGeneration.ts`)
- Utils/lib : camelCase (`buildPrompt.ts`)
- Types : PascalCase suffixé Type ou Interface (`GenerationInput`)

## Ce qu'il ne faut PAS faire
- Ne pas utiliser tRPC (retiré du projet)
- Ne pas installer de nouvelles dépendances sans commentaire explicatif
- Ne pas modifier le schéma Supabase directement — passer par les migrations
- Ne pas stocker de données sensibles dans le localStorage

src/
├── app/              # Routing uniquement
├── features/         # Logique métier par domaine
│   ├── auth/
│   ├── generation/
│   ├── export/
│   ├── billing/
│   └── profile/
├── lib/
│   ├── supabase/
│   ├── llm/
│   └── prompts/
└── components/
├── ui/           # shadcn uniquement
└── shared/