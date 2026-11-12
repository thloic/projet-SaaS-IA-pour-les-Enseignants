# Plan technique — Accès Google Drive complet pour l'agent

Référence produit : `docs/PRD-agent-envoi-gmail-drive.md`. Ce document remplace la version « sélecteur de fichier (Picker) » : le Picker, sa clé API et les routes d'import sont retirés.

## 1. Décisions

- **Tool calling AI SDK** : l'agent appelle des outils liés à l'enseignant connecté (`userId` figé côté serveur, jamais fourni par le modèle).
- **Scope unique** : `https://www.googleapis.com/auth/drive` (lecture, création, modification). Pas de Picker, pas de clé API navigateur, pas de jeton exposé au navigateur.
- **Écriture jamais directe** : `drive_propose_change` ne fait que décrire la modification. La carte « Confirmer / Annuler » appelle ensuite `POST /api/agent/drive/apply`, qui revalide la structure et applique.
- **Données, pas instructions** : le contenu des fichiers et des courriels est entouré de délimiteurs (`<document_drive>`) et neutralisé. Le prompt précise qu'il ne contient jamais d'ordres.
- **Réglages** : deux fonctionnalités visibles, « Gmail » (`gmail.readonly` + `gmail.send`) et « Google Drive — accès complet » (`drive`). Une fonctionnalité est active seulement si tous ses scopes sont accordés (`isFeatureSatisfied`).

## 2. Outils de l'agent (`src/features/agent/server/agentTools.ts`)

| Outil | Rôle | Écriture |
|---|---|---|
| `drive_search` | Lister / chercher des fichiers (nom, date) | non |
| `drive_read` | Lire un fichier (Google Doc, PDF texte, DOCX, TXT, Markdown) | non |
| `drive_propose_change` | Proposer `update_doc` (Google Doc existant) ou `create_doc` | non (carte) |
| `gmail_read_message` | Lire un courriel complet (`messageId`) | non |
| `search_gmail_inbox` | Chercher dans la boîte mail | non |
| `prepare_parent_email_send` | Afficher le brouillon à envoyer (relecture) | non |

Sorties communes : `ok`, `proposal`, `needs_connection` (feature `gmail` ou `drive`), `error` avec un code métier. Aucun message brut de Google n'est renvoyé au modèle.

## 3. Modules

- `src/features/integrations/google/schemas/googleIntegrationSchema.ts` — scopes, features, `isFeatureSatisfied`.
- `src/features/integrations/drive/schemas/driveChangeSchema.ts` — `driveChangeSchema` (update_doc / create_doc, strict), entrées des outils.
- `src/features/integrations/drive/server/driveTools.ts` — logique métier avec dépendances injectées : `searchDriveFiles`, `readDriveFile`, `proposeDriveChange`, `applyDriveChange`. Codes : `DRIVE_NOT_CONNECTED`, `DRIVE_SCOPE_MISSING`, `FILE_NOT_FOUND`, `FILE_UNSUPPORTED`, `FILE_TOO_LARGE`, `FILE_EMPTY`, `CHANGE_UNSUPPORTED`, `DRIVE_FAILED`.
- `src/features/integrations/drive/server/driveFileClient.ts` — appels réels Drive v3 et Docs v1 (`files.list/get/export/create`, `documents.batchUpdate`).
- `src/features/integrations/drive/server/driveRealDependencies.ts` — câblage réel (server-only).
- `src/features/integrations/drive/server/driveFileText.ts` — extraction de texte, troncature à 40 000 caractères.
- `src/features/agent/server/driveAgentTools.ts` — outils AI SDK `drive_search`, `drive_read`, `drive_propose_change`.
- `src/features/agent/server/gmailReadMessageTool.ts` — outil `gmail_read_message`.
- `src/features/integrations/google/server/gmailMessageBody.ts` — extraction du corps (texte brut, repli HTML, 20 000 caractères).
- `src/features/agent/server/integrationGates.ts` — garde-fous déterministes `gmail` / `drive`.
- `src/app/api/agent/chat/route.ts` — garde-fou, boucle de lecture du flux, carte `drive_change_proposal` (`stepCountIs(8)`).
- `src/app/api/agent/drive/apply/route.ts` — application confirmée (auth, validation, codes HTTP 404 / 409 / 422 / 500).
- `src/features/agent/components/DriveChangeCard.tsx` — carte de confirmation.

## 4. Tests

- Unitaires (`npm run test:unit`) : intentions, schémas, gardes Gmail/Drive, carte de proposition, corps Gmail, extraction de texte.
- Intégration (`npm run test:integration`) : `tests/integration/drive-import-flow.test.ts` — recherche, lecture, proposition sans écriture, application après confirmation, refus d'un fichier non Google Doc, Drive absent, aucun message brut exposé.
- Aucun test n'appelle Google : toutes les dépendances réseau sont injectées.

## 5. Limites connues

- Seuls les Google Docs peuvent être modifiés ; DOCX, PDF et TXT restent en lecture seule (v1).
- Si le modèle écrit du texte avant d'appeler `drive_propose_change`, la réponse est déjà en flux texte et la carte n'est pas affichée. Le prompt demande d'appeler les outils d'abord ; à surveiller en test manuel.
- Un message d'erreur Google inattendu est journalisé côté serveur (`console.error`) mais jamais renvoyé au modèle ni à l'enseignant.
- Vérification Google requise avant ouverture publique (scopes `drive`, `gmail.readonly`, `gmail.send`).

## 6. Configuration Google Cloud (à faire par le client)

Voir la section « Étapes Google Cloud » du compte rendu de session. Variables retirées : `GOOGLE_PICKER_API_KEY`, `GOOGLE_CLOUD_PROJECT_NUMBER`.
