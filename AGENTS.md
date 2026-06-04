=# AGENTS.md — EducAssist

Ce fichier instruit les agents IA (Copilot, Claude Code, etc.) sur ce projet.

## Stack
Next.js 14 · Supabase · LiteLLM + Claude Sonnet 4 · Stripe · Tailwind + shadcn/ui

## Commandes utiles
- `npm run dev` : lancer le serveur de dev
- `npm run build` : build de production
- `npm run lint` : vérifier le code

## Priorités MVP
1. Formulaire de génération zero-prompt
2. Streaming LLM + affichage
3. Export PDF/DOCX
4. Freemium gate (3 générations max)

## Ne jamais faire
- Bypasser le RLS Supabase
- Ajouter des dépendances sans justification
- Mettre de la logique métier dans app/ (uniquement dans features/)