# TECHPLAN — Import d'un document Google Drive comme source de génération

Statut : **proposition, en attente de validation** (aucun code Drive écrit).
Référence produit : `docs/PRD-agent-envoi-gmail-drive.md`, section Drive (prochaine étape de ce PRD).

## 1. Objectif

Quand l'enseignant veut que l'agent s'appuie sur un document de son Google Drive (gabarit, lettre type, exercice de référence), il choisit ce fichier précis via la fenêtre native Google. Le texte du fichier devient la source de la génération en cours, sans téléchargement ni réimport manuel.

## 2. Périmètre

Inclus :
- Connexion Drive séparée de Gmail (scope `drive.file`, déjà défini dans `googleIntegrationSchema.ts` et déjà géré par `GET /api/integrations/google/connect?feature=drive`).
- Sélecteur de fichier Google Picker, côté navigateur, limité aux fichiers choisis.
- Lecture du contenu côté serveur pour les formats `.docx`, `.pdf`, `.txt`, et Google Docs (export texte).
- Utilisation du texte comme source de génération pour la requête en cours.

Hors périmètre :
- Accès libre au Drive, parcours de dossiers par l'agent (interdit par le PRD).
- Indexation ou cache du contenu Drive (interdit par le PRD).
- Écriture dans le Drive.
- Sources Google Sheets / Slides (à voir plus tard).

## 3. Décision à valider : sélecteur

Le PRD impose la fenêtre native Google. Deux options :

| Option | Principe | Coût |
|---|---|---|
| **A. Google Picker (recommandé)** | Script `apis.google.com/js/api.js` chargé dans le navigateur, avec un identifiant de projet et une clé API navigateur. Le fichier est renvoyé au client, puis son `fileId` est envoyé au serveur. | Ajouter deux variables d'environnement (`GOOGLE_PICKER_API_KEY`, `GOOGLE_CLOUD_PROJECT_NUMBER`) et activer l'API Picker dans Google Cloud. Pas de nouvelle dépendance npm. |
| B. Liste de fichiers maison | Le serveur liste le Drive et l'enseignant choisit dans une liste EducAssist. | Contraire au PRD : l'application voit tout le Drive. Refusé. |

Je recommande A. Il faut votre accord et la clé API navigateur (restreinte aux domaines `localhost:3000` et `www.eduassist360.com`).

## 4. Flux

1. L'enseignant demande : « utilise mon gabarit du Drive ».
2. Si Drive n'est pas connecté : carte « Connecter Google Drive » (même mécanisme que Gmail, feature `drive`).
3. Si connecté : l'agent renvoie une carte « Choisir un fichier dans Drive ».
4. Le clic ouvre le Picker (client). Le client reçoit `{ id, name, mimeType }`.
5. Le client appelle `POST /api/integrations/drive/import` avec le `fileId`.
6. Le serveur :
   - vérifie la session et le scope `drive.file` (`getValidGoogleAccessToken`, scope `DRIVE_FILE_SCOPE`) ;
   - télécharge ou exporte le fichier (`files.get` avec `alt=media`, ou `files.export` en `text/plain` pour Google Docs) ;
   - extrait le texte (`.docx` via mammoth ou équivalent, `.pdf` via un extracteur, `.txt` direct) ;
   - tronque à une taille maximale (ex. 40 000 caractères) et renvoie `{ name, text, truncated }`.
7. Le texte est injecté comme source pour la génération en cours. Rien n'est conservé au-delà de la requête.

## 5. Fichiers à créer ou modifier

- `src/features/integrations/drive/server/driveFileImport.ts` — téléchargement, export, extraction, troncature (fonctions pures testables + appels Drive injectés).
- `src/app/api/integrations/drive/import/route.ts` — route POST, auth, validation du `fileId`.
- `src/features/integrations/drive/components/DrivePickerButton.tsx` — chargement de `api.js`, ouverture du Picker, appel de la route.
- `src/features/agent/schemas/agentSchema.ts` — étendre `feature` à `drive` dans `integration_connect_required` et ajouter une carte `drive_file_pick`.
- `src/features/agent/server/agentResponses.ts` — construire la carte de connexion Drive.
- `src/app/api/agent/chat/route.ts` — garde-fou sur les demandes « mon Drive / mon gabarit / ce document » (même principe que Gmail).
- `src/features/agent/components/AgentChat.tsx` — rendu de la carte de sélection et reprise après connexion.
- Variables : `GOOGLE_PICKER_API_KEY`, `GOOGLE_CLOUD_PROJECT_NUMBER` dans `.env.example` (vides) et `.env.local`.

## 6. Tests

- Unitaires : extraction et troncature (`.txt`, `.docx` minimal, fichier trop long), refus d'un `fileId` vide ou invalide, garde-fou Drive (`looksLikeDriveRequest`).
- Intégration (appels Drive simulés) : fichier importé, scope manquant, fichier introuvable (404), jeton expiré rafraîchi.
- Navigateur : connexion Drive, ouverture du Picker, choix d'un fichier de test, réponse de l'agent qui utilise son contenu.

## 7. Risques

- **Restriction de la clé API Picker** : une clé non restreinte peut être abusée. À limiter aux origines autorisées.
- **Vérification Google** : `drive.file` n'est pas un scope sensible, donc pas de vérification lourde, mais l'écran de consentement reste en mode test tant que l'application n'est pas publiée.
- **Données élèves** : le document peut contenir des données d'élèves. Le texte n'est ni stocké ni envoyé hors du serveur, sauf vers le modèle pour la génération demandée.

## 8. Questions ouvertes

1. Option A (Picker) validée ? Si oui, j'ai besoin de la clé API navigateur et du numéro de projet Google Cloud.
2. Formats prioritaires : `.docx`, `.pdf`, Google Docs. Faut-il ajouter autre chose ?
3. Taille maximale acceptée pour le texte importé (40 000 caractères proposés) ?

## 9. Ordre de livraison proposé

1. Validation de la Gmail (en cours, bloquée par l'écran de consentement).
2. Drive : serveur (extraction + route) avec tests unitaires.
3. Drive : Picker et carte dans l'agent, puis test navigateur.
4. Commit et push, une fois la fonctionnalité validée par vous.
