# Proposition produit — Une conversation continue avec l’agent

Statut : proposition prête à implémenter, interface non modifiée.

Sources : inspection de `AgentChat.tsx`, des cartes PAT/bulletin, des schémas et orchestrations de l’agent ; `DESIGN.md` ; PRD et plan du contexte de classe. Aucune séance d’observation utilisateur ni vérification visuelle dans le navigateur n’a été effectuée pour cette proposition. Les choix visuels restent à valider sur les parcours ci-dessous.

## Objectif

L’enseignant doit pouvoir poser une question, préciser de qui il parle, lire la réponse, produire un document puis poursuivre sans perdre son intention ni son travail.

« Naturel » signifie ici : ne pas répéter inutilement sa demande, distinguer les interlocuteurs, comprendre ce qui se passe et garder le contrôle. L’apparence soutient ces comportements.

## Problèmes constatés dans le code

| Constat | Conséquence pour l’enseignant |
| --- | --- |
| `handleSend` reconstruit les messages affichés à partir des seuls messages texte | Les cartes PAT/bulletin disparaissent au prochain envoi. Les informations de clarification des anciens messages sont aussi perdues. |
| Un choix d’élève utilise systématiquement `copy.patPrompt` | Une question sur les absences se transforme en demande de PAT. |
| L’intention est surtout extraite du dernier message ; la clarification de classe renvoie du texte | Répondre uniquement « 8A » ou un nom ne garantit pas la reprise de la demande originale dans tous les parcours. |
| Les cartes conservent leurs retouches dans leur état local | Une carte démontée perd ses retouches ; la version retouchée n’est pas automatiquement celle stockée côté serveur. |
| Une erreur supprime le dernier message assistant | Une réponse partiellement reçue peut disparaître sans possibilité de la relire. |
| Un seul booléen `isStreaming`, un indicateur « … », aucun suivi du défilement | Attente, réception, interruption et échec sont peu différenciés. |
| Le texte est affiché avec `whitespace-pre-line` | Les listes, passages importants et tableaux ne sont pas réellement mis en forme. |
| Une couleur violette locale et des couleurs de texte forcées coexistent avec les variables du thème | La présentation ne suit pas complètement le système clair/sombre du produit. |

## Expérience proposée

### 1. Un point de départ simple et une aide toujours accessible

Titre sobre : « Assistant EducAssist ». Invitation : « Que souhaitez-vous préparer ou comprendre ? »

Trois entrées :

- « Faire le point sur une classe » : amorce une question collective.
- « Parler d’un élève » : place un texte court dans la saisie et permet de préciser l’élève.
- « Préparer un document » : ouvre les choix PAT / commentaire de bulletin déjà disponibles.

Une action prépare un brouillon ; elle ne lance pas une génération payante et ne remplace pas silencieusement un brouillon existant. Pendant la conversation, ces entrées restent accessibles via « Idées de demandes » près de la saisie. Pas de salutation personnalisée répétée, de carrousel ni d’animation décorative.

### 2. Un fil qui conserve les échanges et les documents

Les messages utilisateur gardent une bulle légère alignée à droite. Les réponses de l’agent sont alignées à gauche, avec un repère « EducAssist », des paragraphes aérés et une largeur de lecture maîtrisée. La distinction des rôles ne repose pas uniquement sur la couleur.

Les cartes PAT/bulletin restent dans le fil. Elles présentent leur titre, l’élève concerné lorsque l’identité est disponible, puis les actions réellement prises en charge : relire, copier ou exporter selon le document. Une carte peut être repliée ; ses retouches restent intactes à la réouverture et après un nouveau message.

Pour les retouches non sauvegardées : « Modifications locales — non enregistrées dans l’historique ». Le libellé actuel ne doit pas laisser croire que chaque frappe actualise le document enregistré. Le contenu copié/exporté correspond au brouillon visible.

La conservation couvre la page de conversation ouverte. Retrouver tout le fil après rechargement ou changement d’appareil n’est pas promis par ce lot. Les documents déjà sauvegardés gardent leur historique existant.

### 3. Une clarification qui poursuit la bonne demande

Exemple :

> Enseignant : « Combien d’absences a Marie ? »
>
> EducAssist : « De quelle Marie parlez-vous ? »
>
> Choix : « Marie Martin · 8A » / « Marie Dubois · 8B »
>
> Enseignant choisit Marie Martin.
>
> EducAssist répond sur ses absences, sans déclencher de PAT.

Même comportement pour une classe et pour un document. Une demande de bulletin garde sa matière, sa note et ses consignes après le choix de l’élève. L’enseignant peut aussi répondre en texte libre.

Le choix validé apparaît dans le fil. Une ancienne clarification devient résolue ou remplacée lorsque l’enseignant change explicitement de demande ; ses boutons ne relancent pas silencieusement une ancienne génération.

### 4. Un contexte expliqué au bon endroit

Sous une réponse concernée, une ligne discrète indique par exemple : « Classe 8A · Activité du 11 août au 9 septembre ». Elle décrit les données effectivement chargées pour cette réponse, transmises par le serveur.

Pas de pastille globale persistante qui donnerait l’impression que toutes les questions suivantes portent obligatoirement sur cette classe. Une réponse générale n’affiche pas de contexte de classe. Une moyenne d’évaluation précise son titre et son barème ; elle n’hérite pas abusivement de la fenêtre d’activité de 30 jours.

Ce repère indique les données consultées, pas une preuve que chaque phrase générée est correcte. Il ne présente ni score de confiance inventé ni mention « vérifié ».

### 5. Une saisie et des états qui gardent l’enseignant aux commandes

- Champ à hauteur automatique, saisie conservée lors d’une erreur, bouton d’envoi intégré et nommé pour les lecteurs d’écran.
- Entrée envoie, Maj+Entrée ajoute une ligne ; aucune soumission pendant une composition de texte IME.
- « Préparation de la réponse… » pendant l’attente ; « Réponse en cours… » pendant la réception. Pas de fausses étapes comme « Analyse approfondie » si aucune étape correspondante n’est observée.
- « Arrêter » interrompt une réponse textuelle en cours et conserve la partie reçue, marquée « Réponse interrompue ».
- La génération structurée d’un document affiche un état spécifique. Ce lot ne présente pas son interruption comme une annulation de sauvegarde.
- En cas d’erreur, message local au tour concerné. Une réponse partielle reste lisible et copiable. « Réessayer » est explicite pour une réponse informative ; après une génération de document dont la sauvegarde est incertaine, proposer de vérifier l’historique avant toute nouvelle génération.
- Le défilement suit l’agent tant que l’enseignant reste en bas. S’il remonte, sa position est préservée et « Voir la réponse en cours » permet de revenir.

## Direction visuelle

Réutiliser Geist et les variables de `DESIGN.md` : fond légèrement teinté, violet en accent, surfaces discrètes, modes clair et sombre. Ne pas introduire une nouvelle palette ou une police spécifique au chat.

Largeur cible : environ 48rem pour le fil, réponses textuelles limitées à environ 65–75 caractères par ligne lorsque l’écran le permet. Corps de texte de 16px pour la conversation, informations secondaires de 12–14px. Sur mobile, utiliser toute la largeur disponible avec des marges de 16px ; seuls les tableaux peuvent défiler horizontalement dans leur propre conteneur.

La zone de saisie reste accessible en bas sans masquer les messages ni passer sous le clavier mobile. Les contours séparent les zones interactives et les documents ; ils ne doivent pas enfermer chaque paragraphe.

## Périmètre et arbitrages

Livrer les corrections de continuité avant les enrichissements de présentation. Les choix d’interface se valident avec des exemples de classe et d’élève fictifs.

Ce lot inclut : conservation en mémoire du fil et des retouches, clarification fidèle à la demande, états de requête, saisie/défilement, mise en forme sûre, contexte par réponse, aide accessible et adaptation mobile.

Reportés : historique persistant des conversations, sauvegarde automatique des retouches de documents, référence conversationnelle fiable à n’importe quelle ancienne carte (« modifie ce document »), pièces jointes, voix, recherche parmi les conversations, actions proactives, nouveaux connecteurs et changement du modèle IA. Ne pas ajouter d’action d’interface qui promet ces fonctions.

La spécification historique `AGENT_IA_SPEC.md` décrit une ancienne V1. Les évolutions de lecture de classe sont déjà couvertes par le PRD du contexte de classe ; la présente proposition renouvelle les entrées d’accueil et les clarifications. Elle conserve l’accès explicite au PAT et au bulletin, sans tool calling externe.

## Critères d’acceptation

1. Un PAT et un bulletin restent visibles et modifiables après trois nouveaux messages.
2. Les retouches survivent au repli/réouverture d’une carte ; copie/export utilisent la version visible, y compris le dernier champ modifié.
3. Une clarification d’élève après une question d’absences aboutit à cette réponse, jamais à un PAT.
4. Les clarifications PAT, bulletin et modification conservent leur intention initiale et les champs déjà connus ; un choix non autorisé est refusé avant génération.
5. Une clarification de classe reprend la question initiale ; une nouvelle demande ne réactive pas une ancienne clarification.
6. Un arrêt ou une erreur réseau ne supprime pas le contenu textuel déjà reçu ; aucune ancienne requête n’écrit dans un nouveau tour.
7. Une réponse n’affiche que le contexte renvoyé pour elle par le serveur, avec les périodes propres aux données concernées.
8. Lire plus haut ne provoque aucun retour forcé en bas ; envoyer, choisir un élève, copier et revenir en bas sont possibles au clavier.
9. Les états vide, attente, réponse longue, erreur, clarification et document restent utilisables à 375px et à 1280px, dans les deux thèmes et en français, anglais et espagnol.
10. L’aide aux demandes reste accessible après le premier échange ; aucune action rapide n’écrase une saisie en cours.

## Validation produit

Faire parcourir à un enseignant trois scénarios sans lui indiquer la marche à suivre : consulter une classe puis un élève homonyme ; produire et retoucher un document puis poursuivre ; interrompre une réponse longue et reprendre.

Observer s’il retrouve le document, comprend quel élève et quelle période sont utilisés, sait si ses retouches sont enregistrées et peut continuer sans reformuler sa demande. Mesurer les reformulations imposées et les pertes de travail ; ne pas confondre satisfaction esthétique et réussite du parcours. Ces observations restent à réaliser.
