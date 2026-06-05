---
applyTo: "src/features/bulletin/**"
---

# Instructions — Feature Bulletin Comments

## Rôle
Générer un commentaire de bulletin personnalisé et bienveillant pour un élève,
basé sur sa note, sa matière et les observations libres de l'enseignant.

## Flux
1. L'enseignant remplit le formulaire : nom, matière, note, observations
2. POST /api/bulletin { studentName, subject, grade, observations, tone }
3. buildBulletinPrompt(input, teacherProfile) → appel LLM
4. Sauvegarde dans bulletin_comments
5. Affiche le commentaire avec bouton copier/exporter

## Prompt attendu
Le prompt doit injecter :
- Le profil enseignant (pays, matière, niveau) pour adapter la terminologie
- Le ton demandé (bienveillant / encourageant / factuel)
- La note avec le barème local (ex: /20 en France, lettre A-F en Amérique)
- Les observations comme contexte humain

## Règles
- Commentaire entre 3 et 6 lignes — ni trop court ni trop long
- Jamais de formulation négative directe — toujours reformuler en axe de progrès
- Adapter la terminologie selon le pays du profil enseignant
- Ne modifie rien d'autre que ce qui est demandé.