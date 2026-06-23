# CLAUDE.md — EducAssist

> Ce fichier est lu automatiquement par Claude Code à chaque session. Il définit le contexte permanent du projet. Lis-le intégralement avant toute action.

---

## 1. Ce qu'est le projet

**EducAssist** est une plateforme SaaS web destinée **uniquement aux enseignants**. Sa promesse : réduire drastiquement le temps passé sur les tâches de préparation, de correction, de communication et de planification, grâce à une IA qui comprend le profil de l'enseignant (matière, niveau, pays, programme officiel).

**La règle d'or du produit** : chaque fonctionnalité doit faire gagner du temps réel et mesurable à l'enseignant. Si une fonctionnalité ne fait pas gagner de temps, elle n'a pas sa place.

Le produit est organisé en **5 modules** + un socle technique + un tableau de bord central. Il est développé **fonctionnalité par fonctionnalité**, dans un ordre précis (voir section 8), du plus sûr au plus risqué.

**Public cible** : enseignants du primaire, secondaire et universitaire, principalement dans le contexte canadien (Québec / PFEQ, Ontario), avec une architecture qui n'exclut pas d'autres pays par la suite.

---

## 2. Principes produit non négociables

Ces trois principes guident TOUTES les décisions de développement :

1. **Aucune donnée d'élève ne quitte le serveur sans chiffrement.** La confiance est la condition d'adoption en milieu scolaire. Isolation stricte des données par utilisateur.
2. **Chaque sortie de l'IA est validée par l'enseignant avant d'être envoyée ou publiée.** L'IA est un assistant, jamais un remplaçant. L'enseignant reste maître.
3. **L'enseignant ne doit jamais avoir à rédiger un prompt.** L'interface est faite de formulaires guidés. Le profil de l'enseignant est injecté silencieusement dans chaque génération.

---

## 3. Stack technique (à respecter, ne pas substituer sans validation)

- **Framework** : Next.js 
- **Langage** : TypeScript strict
- **Styling** : Tailwind CSS
- **Composants UI** : shadcn/ui
- **Animations** : GSAP avec @gsap/react
- **Icônes** : Lucide React
- **Base de données + Auth + Storage** : Supabase (avec SSR)
- **Couche IA** : Vercel AI SDK, streaming avec Claude Sonnet
- **Paiement** : Stripe
- **Emails** : Resend
- **Analytics** : PostHog
- **Déploiement** : Vercel (CI/CD automatique sur push)

**Gestion d'état** : useState / useContext / useReducer natifs. **PAS** de librairie d'état externe (pas de Redux, Zustand, etc.).

---

## 4. Règles de travail (comportement attendu de Claude Code)

1. **Une fonctionnalité à la fois.** Ne jamais coder plusieurs fonctionnalités dans une même session. Se concentrer sur la fiche de fonctionnalité courante.
2. **Toujours présenter un plan avant de coder** toute fonctionnalité non triviale, et attendre la validation explicite du développeur.
3. **Montrer chaque fichier modifié** et expliquer brièvement le changement.
4. **Ne jamais toucher à du code hors du périmètre de la tâche en cours.** Ne pas refactorer spontanément, ne pas « améliorer » ce qui n'a pas été demandé.
5. **Respecter strictement la stack** de la section 3. Si une dépendance externe semble nécessaire, la proposer et attendre validation avant de l'installer.
6. **Variables d'environnement** : jamais commitées, toujours via `.env.local` et documentées dans `.env.example`.
7. **Commit après chaque fonctionnalité validée**, avec un message clair en français décrivant ce qui a été fait.
8. **Sécurité des données élèves** : toute table contenant des données personnelles d'élèves doit avoir une Row Level Security (RLS) Supabase activée. Pas d'exception.
9. **Validation humaine** : toute fonctionnalité qui produit une sortie destinée à un parent, un élève ou un bulletin doit prévoir une étape de relecture/validation par l'enseignant avant action.

---

## 5. Modèle de données (cœur, à étendre sans refactoring)

Tables principales (PostgreSQL / Supabase) :

- **users** : id (UUID), email, plan (free/pro), generation_count, created_at
- **teacher_profiles** : id, user_id (FK), subject, level, country, style_notes — *injecté dans chaque génération IA*
- **generations** : id, user_id (FK), title, content_json (JSONB), share_token, feedback, created_at
- **exports** : id, generation_id (FK), format (pdf/docx), storage_path, created_at
- **student_profiles** : id, user_id (FK), name, needs (DYS, TDAH, allophone...), language — *RLS obligatoire*

Ce schéma est minimal et sera étendu module par module. Ne pas tout créer d'un coup : chaque fonctionnalité ajoute ce dont elle a besoin.

---

## 6. Sécurité & conformité (RGPD / LPRPDE)

- Chiffrement au repos (AES-256 via Supabase) et en transit (TLS).
- Row Level Security PostgreSQL : chaque utilisateur n'accède qu'à ses propres données.
- Sessions courtes (1h) avec renouvellement silencieux.
- Droit à l'effacement intégré (suppression en cascade).
- Les données ne sont JAMAIS utilisées pour entraîner les modèles d'IA.
- Scopes OAuth Google limités au strict nécessaire (profil + email). Scopes sensibles (Drive/Gmail) reportés.
- Rate limiting sur les appels pour prévenir les abus.

---

## 7. Distinction critique : LOGICIEL vs CONTENU

C'est le point le plus important à comprendre sur ce projet.

Certaines fonctionnalités décrivent du **logiciel** (qu'on code une fois) ; d'autres dépendent de **contenu éditorial** (que le client doit produire et maintenir à la main). Il n'existe AUCUNE API officielle qui fournit les programmes scolaires ministériels structurés.

Concrètement : pour les fonctionnalités d'**alignement curriculaire** (fonctionnalité 22), de **remplissage des grilles de compétences** (23), de **calendrier pédagogique** (24) et de **notification de changement de programme** (25), Claude Code construit le **moteur et la structure** — mais le **contenu curriculaire** (compétences officielles, référentiels, calendriers scolaires) est un actif fourni par le client. Sans ce contenu, ces fonctionnalités sont des coquilles vides.

Ne jamais coder une « mise à jour automatique des programmes depuis le ministère » : ça n'existe pas. Le système réagit à une mise à jour MANUELLE de la base de contenu, il ne détecte rien côté ministère.

---

## 8. Index des fonctionnalités — ordre de développement

Le développement suit cet ordre strict, du plus sûr au plus risqué. Le détail de chaque fonctionnalité est dans `docs/cahier-des-charges.md`.

**Fondations (le socle, rien ne marche sans)**
1. Setup infrastructure projet (Next.js, Supabase, Vercel, GitHub)
2. Authentification & inscription (email + Google SSO)
3. Onboarding profil enseignant (matière, niveau, pays)
4. Tableau de bord principal (navigation 3 entrées)

**Première fonction livrable — différenciation (Module 2, la plus propre)**
5. Upload/saisie d'un document source
6. Génération des 5 variantes (Standard, Soutien, DYS, TDAH, Enrichissement)
7. Export PDF & DOCX (transverse)
8. Profil élève persistant
9. Banque de ressources adaptées + partage

**Extension du moteur — séquences (Module 4 moteur)**
10. Génération de séquence pédagogique (moteur)

**Communication parents — génération (Module 3, sans infra lourde)**
11. Générateur de messages parents (par étiquettes)
12. Traduction automatique des messages
13. Portail de communication centralisé (historique)

**Correction IA — partie sûre (Module 1, sans OCR)**
14. Import de copies multi-format (texte numérique)
15. Commentaires personnalisés par élève (3 tons)
16. Détection & classification des erreurs
17. Tableau récapitulatif de classe
18. Mémoire pédagogique (calibrage du style)

**Monétisation (une fois qu'il y a de la valeur)**
19. Modèle freemium + paiement Stripe
20. Système de parrainage (1 mois offert)
21. Gestion des 4 paliers d'abonnement

**Dépend du contenu fourni par le client (Module 4 + grilles Module 1)**
22. Alignement curriculaire sur programmes officiels
23. Remplissage auto des grilles de compétences
24. Calendrier pédagogique intégré
25. Notification de changement de programme

**Paris techniques et infra lourde (en fin de parcours)**
26. OCR manuscrit des copies
27. Envoi réel + accusés de lecture
28. Alertes proactives (patterns préoccupants)

**Module 5 — gestion de classe (produit quasi séparé, en dernier)**
29. Saisie rapide présences / participation / observations
30. Synchronisation des données vers le bulletin
31. Analytics de classe + groupes de travail

**Couche d'intégration finale (a besoin que les autres modules existent)**
32. Tableau de bord enseignant unifié (vue 360°)
33. Bibliothèque de séquences collaboratives
34. Intégrations LMS (Google Classroom, Teams, Moodle, Mozaïk)

---

## 9. Comment travailler une fonctionnalité (workflow)

1. Le développeur indique le numéro de la fonctionnalité à développer.
2. Claude Code lit la fiche correspondante dans `docs/cahier-des-charges.md`.
3. Claude Code présente un plan d'implémentation et attend validation.
4. Après validation, implémentation fichier par fichier.
5. Tests par le développeur.
6. Commit avec message clair.
7. Fonctionnalité suivante (nouvelle session propre).

---

## 10. Apports attendus du client (bloquants pour certaines fonctionnalités)

Certaines fonctionnalités ne peuvent pas être terminées sans un apport du client. À signaler au développeur quand on les atteint :

- **Fonctionnalité 1** : comptes GitHub, Vercel, Supabase (au nom du client), puis clés API (Anthropic, Stripe, Resend, PostHog).
- **Fonctionnalité 6** : définition pédagogique précise de chaque variante (règles de transformation) + exemples.
- **Fonctionnalité 11** : modèles de messages types utilisés par l'équipe.
- **Fonctionnalité 15** : exemples de commentaires réels pour calibrer le ton.
- **Fonctionnalités 22 & 23** : le contenu curriculaire officiel structuré (compétences, référentiels) — apport majeur.
- **Fonctionnalité 24** : calendrier scolaire local de la région de départ.
- **Fonctionnalité 26** : 5 à 10 vraies copies d'élèves pour tester l'OCR avant engagement.
- **Fonctionnalité 27** : décision sur le canal de communication (email / portail / SMS) + domaine vérifié Resend.
- **Fonctionnalité 29** : décision app mobile native vs version web mobile.
- **Fonctionnalité 34** : priorité des intégrations + comptes développeur Google Cloud / Microsoft.