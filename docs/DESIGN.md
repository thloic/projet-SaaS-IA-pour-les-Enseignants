# Design System — EducAssist

## Product Context
- **Quoi** : plateforme SaaS d'assistance pédagogique par IA.
- **Pour qui** : enseignants du primaire, secondaire et universitaire, non-techniques, souvent pressés.
- **Espace** : outils EdTech / SaaS pédagogique.
- **Type** : dashboard / web app.
- **Memorable thing** : rassurant et pro.

## Aesthetic Direction
- **Direction** : Minimal restreint, adouci par des formes arrondies et un seul accent chaud.
- **Décoration** : minimal.
- **Mood** : le sérieux vient de la sobriété, le rassurant vient de la rondeur des formes et de la clarté des états. Aucune ambiguïté visuelle pour un utilisateur non-technique qui scanne vite.
- **Références** : construit à partir du système déjà en place dans le code (pas de recherche externe, décision explicite du développeur pour aller vite).

## Typography
- **Display/Hero** : Geist (weight 900) — déjà chargée et utilisée pour tous les titres, pas de nouvelle police introduite pour rester cohérent avec l'existant.
- **Body** : Geist (400/500) — déjà la police du produit (`--font-geist-sans`).
- **Data/Tables** : Geist avec chiffres tabulaires (`font-variant-numeric: tabular-nums`) — pour les comptages du tableau récapitulatif de classe.
- **Code** : Geist Mono — déjà chargée (`--font-geist-mono`).
- **Loading** : déjà self-hosted via `next/font` (package `geist`), rien à charger de plus.
- **Scale** : 12 / 14 / 16 / 20 / 22 / 28 / 40 / 56 px.

## Color
- **Approche** : restreinte — un seul accent fort, le reste en neutres teintés et sémantique.
- **Primary** : `#534AB7` (light) / `#8B7FE0` (dark, plus clair pour le contraste sur fond sombre) — **désormais la vraie variable `--primary` du thème shadcn** (`globals.css`), plus seulement une constante locale par composant. Corrige un défaut réel : tous les `focus:ring-primary/20`, `bg-primary/10 text-primary` déjà écrits dans le code s'affichaient en gris (l'ancien `--primary` neutre) au lieu du violet de marque.
- **Secondary** : neutres teintés violet plutôt que gris neutre pur — `--muted` `#F3F1FA` (light) / `#221F2E` (dark), `--border` `#E7E3F5` (light) / violet à 16% d'opacité (dark).
- **Neutrals / Background** : `#FBFAFE` (light) — léger, presque imperceptible, mais retire le blanc pur froid d'origine (`oklch(1 0 0)`). `--card` reste blanc pur (`#FFFFFF`) pour que les cartes se détachent légèrement du fond au lieu d'un aplat unique. Dark : `#17151F` (fond), `#1E1B29` (cartes).
- **Semantic** : inchangé — succès `#10B981`, attention `#F59E0B`, erreur `#DC2626`.
- **Dark mode** : primary éclairci (`#8B7FE0`) pour rester lisible sur fond sombre ; `--brand-foreground` passe de blanc à `#1A1825` (texte sombre sur bouton primary clair) en dark mode.

## Spacing
- **Base** : 4px.
- **Densité** : confortable — relire des erreurs d'élève doit rester serein, pas clinique.
- **Scale** : 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout
- **Approche** : grid-disciplined — alignement prévisible, pour qu'un enseignant qui relit 30 copies n'ait jamais à « comprendre » la mise en page.
- **Grid** : 1 colonne mobile, 2 colonnes tablette/desktop pour les formulaires ; listes de copies en une seule colonne empilée (scan vertical rapide).
- **Max content width** : 1080px pour les vues de contenu (cohérent avec les pages existantes type `max-w-4xl`/`max-w-6xl`).
- **Border radius** : sm:11px (`radius-sm`), md:15px (`radius-md`), lg:18px (`radius-lg`, cards standards), full:9999px (badges/pills) — repris tel quel du thème shadcn existant (`--radius: 0.625rem` et ses dérivés).

## Motion
- **Approche** : minimal-fonctionnel — uniquement les transitions qui aident la compréhension (chargement, changement d'état), jamais de chorégraphie qui distrait.
- **Easing** : enter(ease-out) exit(ease-in) move(ease-in-out).
- **Duration** : micro(50-100ms) court(150-250ms) moyen(250-400ms) — pas de long/expressif, cohérent avec l'existant (`animate-spin`, `transition-colors`).

## Decisions Log
| Date | Décision | Rationale |
|------|----------|-----------|
| 2026-07-25 | Création initiale | /design — système pour EducAssist, cadré autour du Module 1 Correction IA. Reprend et formalise ce qui existait déjà de façon éparpillée dans le code (couleur de marque, cards arrondies, couleurs sémantiques ad-hoc) plutôt que d'introduire un nouveau système parallèle. |
| 2026-07-25 | Badges de statut systématiques | Nouveauté (RISK assumé) pour le module Correction : statut visuel (validée/en cours/échec/brouillon) sur chaque copie d'un lot, pour un scan rapide de 30 copies — sert directement le critère de succès du PRD sur la vitesse de correction. |
| 2026-07-25 | `#534AB7` non branché sur `--primary` du thème shadcn | Observation initiale : la couleur de marque était redéfinie localement (`const BRAND`) dans chaque composant plutôt que d'être la vraie variable `--primary`. Décision d'origine : ne pas corriger tout de suite (hors périmètre du lot en cours). |
| 2026-07-25 | Correction du mode clair — `--primary` réellement branché sur le violet, fond/neutres teintés | Le développeur n'aimait pas le rendu du mode clair (trop plat/blanc). Cause : `--primary` restait un gris neutre jamais utilisé comme vrai accent, fond blanc pur sans chaleur. Palette revue (voir section Color) ; `--primary` devient enfin la vraie couleur de marque dans le thème, pas seulement une constante par composant. |
