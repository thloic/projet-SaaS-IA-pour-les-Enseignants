# EducAssist — Cahier des charges (référence produit)


---

## Positionnement

« L'unique assistant pédagogique qui comprend votre programme, vos élèves et votre réalité — pas juste votre texte. »

Les enseignants ne manquent pas d'outils. Ils manquent d'un outil qui s'adapte à eux, qui comprend les contraintes du ministère de l'Éducation local, et qui agit à leur place plutôt que de leur créer une liste de tâches supplémentaire.

Un enseignant consacre 6 à 10 heures par semaine à des tâches de préparation non rémunérées. EducAssist gère ces tâches à sa place, en quelques clics, sans qu'il ait besoin d'apprendre à utiliser l'IA ni à rédiger un prompt.

## Les 5 modules

- **Module 1 — Correction IA** : corriger des copies sans y passer ses soirées (analyse, classification d'erreurs, commentaires personnalisés, grilles de compétences).
- **Module 2 — Adapte Leçon** : une leçon déclinée pour tous les profils d'élèves en un clic (différenciation pédagogique).
- **Module 3 — Com. Parent** : communication aux parents sans friction (messages contextuels, traduction, historique).
- **Module 4 — Planification Pro** : planification alignée sur le vrai programme officiel.
- **Module 5 — Tableau** : tableau de bord de classe en temps réel (présences, participation, comportement).

Reliés par un **tableau de bord central** qui donne une vue 360° de chaque élève.

---

# FICHES DES FONCTIONNALITÉS

---

## 1. Setup infrastructure projet

**Objectif** : poser des fondations techniques propres et déployées pour construire toutes les fonctionnalités dessus.

**Ce que ça fait** : initialise le projet, connecte la base de données et l'authentification, met en place le déploiement automatique. C'est le socle invisible mais critique.

**Valeur** : permet une livraison continue et stable. Tout le reste en dépend.

**Apport client** : comptes GitHub, Vercel, Supabase (tous à son nom).

**Vigilance** : tous les comptes au nom du client — propriété, facturation et conformité RGPD des données élèves. Le développeur a les accès, pas la propriété.

---

## 2. Authentification & inscription

**Objectif** : permettre à l'enseignant de créer un compte et se connecter sans friction.

**Ce que ça fait** : inscription/connexion par email ou via Google en un clic. Sessions sécurisées qui se renouvellent. Routes privées protégées.

**Valeur** : la première barrière à franchir pour un nouvel utilisateur doit être quasi inexistante.

**Vigilance** : ne demander que les permissions Google minimales (profil + email). Les accès sensibles (Drive, Gmail) sont volontairement écartés pour éviter une validation longue.

---

## 3. Onboarding profil enseignant

**Objectif** : capturer une seule fois le contexte de l'enseignant pour personnaliser toutes ses générations futures.

**Ce que ça fait** : un court formulaire (~90 secondes) à la première connexion — matière, niveau, pays, style pédagogique. Ce profil est ensuite injecté silencieusement dans chaque génération IA, sans que l'enseignant ait à le redonner.

**Valeur** : c'est ce qui rend l'outil « personnalisé » plutôt que générique. Pièce centrale du produit.

**Vigilance** : toutes les fonctionnalités de génération en dépendent — à construire tôt et solidement.

---

## 4. Tableau de bord principal

**Objectif** : offrir un point d'entrée clair après connexion.

**Ce que ça fait** : interface épurée avec les entrées vers les fonctionnalités disponibles. Évolue à mesure que les modules sont livrés. Parfaitement utilisable sur mobile via le navigateur.

**Valeur** : un enseignant doit comprendre où aller en quelques secondes, sans formation.

**Vigilance** : minimaliste au départ, à enrichir progressivement. Ne pas sur-concevoir.

---

## 5. Upload/saisie d'un document source

**Objectif** : permettre à l'enseignant d'amener dans la plateforme un document existant (un cours, un exercice, une évaluation) qu'il pourra ensuite décliner en plusieurs versions adaptées aux différents profils d'élèves. C'est la première étape du Module 2 (Adapte Leçon).

**Contexte dans le parcours** : l'enseignant arrive ici depuis le tableau de bord (entrée « Documents »). Il a un document sous la main et veut le préparer pour différenciation. À ce stade, aucune génération IA n'a lieu : on se contente de récupérer et préparer le contenu source. La déclinaison en 5 variantes viendra dans la fonctionnalité suivante (6).

**Ce que ça fait concrètement** :
- Propose deux façons d'amener un document : saisie directe (texte collé/écrit), ou import de fichier (texte ou PDF, dont le texte est extrait automatiquement).
- Affiche proprement le document récupéré, modifiable, pour que l'enseignant vérifie que le contenu est correct avant de poursuivre.
- Sauvegarde ce document source (associé à l'enseignant connecté) pour qu'il devienne la base des déclinaisons à venir.
- Présente clairement l'étape suivante (« adapter ce document »), même si la génération elle-même n'est pas encore active — sans lien mort, plutôt une indication « à venir ».

**Ce que ça ne fait PAS (à ce stade)** : pas d'OCR de copies manuscrites (fonctionnalité 26, bien plus tard, et risquée) — on se limite au texte déjà numérique (PDF dont le texte est extrait, ou saisie directe). Un PDF scanné/image n'est pas supporté. Aucune génération IA, aucune transformation du contenu : on stocke et on affiche, c'est tout.

**Contrainte d'affichage** : écran responsive / mobile-first — un enseignant doit pouvoir coller ou importer un document confortablement depuis son téléphone via le navigateur.

**Valeur** : porte d'entrée du module de différenciation.

**Vigilance** : l'extraction de texte d'un PDF peut donner des résultats imparfaits selon la mise en page (colonnes, tableaux) — l'enseignant doit pouvoir relire et corriger le texte extrait avant de continuer, plutôt que de supposer que l'extraction est toujours parfaite. Se limiter au texte numérique — pas d'OCR manuscrit ici (c'est la fonctionnalité 26).

---

## 6. Génération des 5 variantes (Standard, Soutien, DYS, TDAH, Enrichissement)

**Objectif** : décliner un document en 5 versions adaptées aux différents profils d'élèves, en un clic.

**Ce que ça fait** : à partir d'un document source, génère :
- **Standard** : version optimisée du document
- **Soutien** : vocabulaire simplifié, phrases courtes, consignes décomposées étape par étape
- **Dyslexie (DYS)** : police adaptée, interligne aéré, mots espacés, pictogrammes de support
- **TDAH** : tâches découpées en micro-étapes, repères visuels, une seule consigne par zone
- **Enrichissement** : approfondissement, questions ouvertes, ressources additionnelles pour élèves avancés

Le profil de l'enseignant influence le contenu. La génération s'affiche progressivement à l'écran.

**Valeur** : c'est LE cœur du Module 2 et la première vraie fonctionnalité livrable. La différenciation est une obligation légale et éthique dans les classes inclusives, mais elle prend normalement des heures. Ici : quelques secondes.

**Apport client** : la définition pédagogique précise de chaque variante — qu'est-ce qui change exactement entre Soutien et Standard ? Quelles règles pour TDAH ? Le client (pédagogue) valide ces règles, sinon elles sont inventées. Idéalement 1-2 exemples concrets par variante.

**Vigilance** : module le plus propre techniquement. Le seul vrai risque est un mauvais calibrage faute de cadrage pédagogique. Les pictogrammes DYS supposent une banque d'icônes.

---

## 7. Export PDF & DOCX

**Objectif** : permettre à l'enseignant de repartir avec un document concret, imprimable.

**Ce que ça fait** : exporte tout contenu généré (cours, séquences, commentaires, messages) en PDF mis en page et en Word, sans casse de mise en forme. Fonctionnalité transverse à tous les modules de génération.

**Valeur** : un enseignant veut un livrable utilisable en classe immédiatement, pas du texte à copier-coller.

**Vigilance** : la version DYS impose des contraintes de formatage spécifiques (police, interligne) à préserver à l'export.

---

## 8. Profil élève persistant

**Objectif** : mémoriser les besoins de chaque élève pour adapter automatiquement les documents.

**Ce que ça fait** : l'enseignant configure une fois le profil de chaque élève (DYS, TDAH, allophone, nouvellement arrivé...). Ensuite, toute génération peut cibler un élève et appliquer automatiquement la bonne adaptation, sans intervention répétée.

**Valeur** : transforme la différenciation d'un acte manuel répété en un automatisme.

**Vigilance** : données élèves = sensibles. Isolation stricte (chaque enseignant ne voit que ses élèves) et Row Level Security obligatoire. Ne pas exposer de données nominatives au LLM au-delà du nécessaire.

---

## 9. Banque de ressources adaptées + partage

**Objectif** : capitaliser sur le travail d'adaptation déjà fait et permettre la collaboration.

**Ce que ça fait** : sauvegarde les adaptations générées, permet de les réutiliser, et de les partager par lien avec des collègues qui suivent le même élève (orthopédagogue, technicien en éducation spécialisée, autre enseignant).

**Valeur** : évite de refaire le même travail et crée de la collaboration autour de l'élève.

**Vigilance** : le partage de données liées à un élève entre collègues touche au RGPD — cadrer le consentement et le périmètre.

---

## 10. Génération de séquence pédagogique (moteur)

**Objectif** : générer une séquence de cours complète à partir de quelques informations.

**Ce que ça fait** : l'enseignant saisit matière, niveau, thème et durée. Le système produit une séquence structurée — objectifs, activités, durées, matériel, type d'évaluation. Le profil de l'enseignant est injecté. Affichage progressif.

**Valeur** : remplace la page blanche par un point de départ structuré en quelques secondes.

**Vigilance** : la génération « brute » est faisable immédiatement. L'alignement sur les programmes officiels est une fonctionnalité distincte (22) qui dépend du contenu fourni par le client.

---

## 11. Générateur de messages parents (par étiquettes)

**Objectif** : rédiger un message professionnel et bienveillant à un parent en quelques secondes.

**Ce que ça fait** : l'enseignant sélectionne des étiquettes décrivant la situation (devoirs incomplets, amélioration notable, comportement perturbateur...). Le système rédige un message complet et structuré selon le contexte (suivi positif, alerte, convocation, bilan). Le ton est configurable.

**Valeur** : chaque message à un parent est une décision diplomatique délicate, répétée pour 30 familles. Cette fonctionnalité enlève cette charge.

**Apport client** : les modèles de messages types que l'équipe utilise, pour calibrer.

**Vigilance** : la génération est faisable tout de suite. L'envoi réel et les alertes sont des fonctionnalités séparées (27, 28).

---

## 12. Traduction automatique des messages

**Objectif** : permettre la communication avec les familles qui ne parlent pas la langue de l'école.

**Ce que ça fait** : traduit le message généré dans la langue du parent (définie dans le profil de l'élève ou détectée). L'enseignant voit l'original et la traduction.

**Valeur** : différenciateur fort en contexte multiculturel. Un geste simple qui change la relation avec les familles allophones.

**Vigilance** : vérifier la qualité de traduction sur les langues principales du contexte du client.

---

## 13. Portail de communication centralisé

**Objectif** : garder une trace organisée de toutes les communications.

**Ce que ça fait** : historique complet des communications par élève, modèles réutilisables par type de situation, export PDF pour le dossier scolaire.

**Valeur** : une mémoire propre des échanges, utile pour le suivi et le dossier.

**Vigilance** : l'historique est simple. Les accusés de lecture et le suivi des réponses dépendent du canal d'envoi réel (fonctionnalité 27).

---

## 14. Import de copies multi-format (texte numérique)

**Objectif** : amener des copies dans le système pour les faire analyser.

**Ce que ça fait** : import de copies numériques — PDF texte, fichiers texte. Le contenu est extrait et préparé pour l'analyse.

**Valeur** : porte d'entrée du module de correction, sans le risque de l'OCR.

**Vigilance** : se limiter au texte déjà numérique. Le manuscrit (OCR) est une fonctionnalité dédiée et plus risquée (26).

---

## 15. Commentaires personnalisés par élève (3 tons)

**Objectif** : générer un commentaire utile et spécifique pour chaque élève.

**Ce que ça fait** : produit un commentaire basé sur les vraies erreurs de la copie (pas générique), avec 3 tons au choix (encourageant, factuel, direct). Approbation ou modification en un clic. Jamais de formulation négative directe : les difficultés sont reformulées en axes de progrès.

**Valeur** : maintenir une cohérence et une qualité de commentaires sur 30 copies, après une journée de classe, est épuisant. Cette fonctionnalité le fait en gardant l'enseignant maître.

**Apport client** : quelques exemples de commentaires réels que l'équipe écrit, pour calibrer le ton.

**Vigilance** : fonction très solide techniquement, proche du moteur de génération. Bon candidat pour livrer de la valeur tôt dans le Module 1.

---

## 16. Détection & classification des erreurs

**Objectif** : repérer et catégoriser les erreurs d'une copie.

**Ce que ça fait** : analyse une copie, détecte les erreurs et les classe par type (syntaxe, compréhension, méthode).

**Valeur** : gain de temps et cohérence de notation.

**Vigilance** : la qualité dépend de la matière (plus fiable en langues qu'en disciplines très ouvertes). L'enseignant valide toujours — l'IA assiste, ne remplace pas.

---

## 17. Tableau récapitulatif de classe

**Objectif** : donner une vue d'ensemble des résultats de la classe.

**Ce que ça fait** : agrège les analyses de copies pour montrer, d'un coup d'œil, quels objectifs ne sont pas maîtrisés (« 12 élèves n'ont pas maîtrisé l'objectif 3 ») et quels élèves sont concernés.

**Valeur** : permet de décider d'une révision collective sur les points faibles.

**Vigilance** : dépend de l'analyse individuelle (16) et d'une notion d'objectif structurée (lien possible avec la base curriculaire du Module 4).

---

## 18. Mémoire pédagogique (calibrage du style)

**Objectif** : faire en sorte que les suggestions ressemblent de plus en plus à ce que l'enseignant aurait écrit.

**Ce que ça fait** : mémorise les corrections validées par l'enseignant et les réutilise comme exemples dans les générations suivantes.

**Valeur** : plus le temps passe, plus l'outil colle au style de l'enseignant.

**Vigilance** : ce n'est PAS un modèle qui « apprend » au sens entraînement. C'est de la réutilisation d'exemples. À ne pas présenter au client comme une IA qui s'auto-entraîne, sous peine d'attente déçue.

---

## 19. Modèle freemium + paiement Stripe

**Objectif** : convertir les utilisateurs gratuits en abonnés payants.

**Ce que ça fait** : plan gratuit limité (un nombre de générations par mois), compteur, blocage à la limite avec invitation claire à souscrire, paiement via Stripe, gestion des abonnements.

**Valeur** : le modèle économique de la plateforme.

**Apport client** : compte Stripe à son nom (c'est lui qui encaisse).

**Vigilance** : le modèle de prix (paliers) est une hypothèse à valider. Le compteur doit gérer proprement la remise à zéro mensuelle.

---

## 20. Système de parrainage (1 mois offert)

**Objectif** : favoriser la croissance par le bouche-à-oreille.

**Ce que ça fait** : chaque enseignant dispose d'un lien de parrainage. Quand un collègue s'inscrit via ce lien, le parrain reçoit automatiquement un mois gratuit.

**Valeur** : acquisition organique à faible coût, levier de croissance.

**Vigilance** : lié à la logique d'abonnement Stripe.

---

## 21. Gestion des 4 paliers d'abonnement

**Objectif** : monétiser selon le type de client.

**Ce que ça fait** : gère des paliers avec accès différencié aux modules — Starter (enseignant indépendant, modules de base), Pro (tous les modules + tableau de bord), Établissement (plusieurs enseignants + analytics de direction), District (multi-établissements, sur devis).

**Valeur** : adapte l'offre du solo à l'institution.

**Apport client** : validation des prix et du contenu exact de chaque palier.

**Vigilance** : les paliers Établissement et District impliquent une gestion d'organisations (comptes multi-utilisateurs) — complexité supplémentaire à anticiper.

---

## 22. Alignement curriculaire sur programmes officiels

**Objectif** : garantir que les séquences générées sont conformes au programme officiel de l'enseignant.

**Ce que ça fait** : le moteur de génération de séquences consulte une base de données des programmes officiels (par pays, province, niveau, matière) et aligne ses sorties sur les compétences officielles.

**Valeur** : la conformité au programme n'est pas optionnelle — des enseignants ont été évalués négativement pour des séquences non alignées. Cette fonctionnalité élimine ce risque.

**Apport client (MAJEUR)** : le contenu curriculaire lui-même. Aucune API officielle ne livre les curriculums structurés. Cette base doit être constituée à la main par le client et son équipe de pédagogues, pour au moins un périmètre de départ (ex : PFEQ Québec OU Ontario, pas tout d'un coup).

**Vigilance** : le mot « automatiquement » est trompeur. On construit le moteur et la structure ; le contenu est un actif éditorial que le client produit et maintient. Sans contenu, c'est une coquille vide. À trancher avant de chiffrer.

---

## 23. Remplissage auto des grilles de compétences

**Objectif** : pré-remplir les grilles d'évaluation officielles à partir de la copie analysée.

**Ce que ça fait** : à partir de l'analyse d'une copie, propose un remplissage des grilles de compétences. L'enseignant valide ou ajuste au lieu de tout saisir.

**Valeur** : transforme une saisie fastidieuse en une simple validation.

**Apport client** : les référentiels de compétences officiels structurés (pas un PDF, mais une structure : compétences, niveaux, critères). Même nature que la base curriculaire (22).

**Vigilance** : même racine que la 22 — avant de connecter et remplir, il faut avoir digitalisé ces référentiels. Sans contenu, rien à remplir.

---

## 24. Calendrier pédagogique intégré

**Objectif** : visualiser la progression sur l'année et alerter sur les retards de couverture.

**Ce que ça fait** : vues annuelle, par étape et hebdomadaire, intégrant le calendrier scolaire local (congés, examens, journées pédagogiques). Alerte si une compétence essentielle n'a pas été couverte avant la date limite d'une étape.

**Valeur** : un pilotage clair de la planification dans le temps.

**Apport client** : le calendrier scolaire local de la région de départ.

**Vigilance** : l'alerte de couverture dépend de la base curriculaire (22). Sans elle, rien à vérifier.

---

## 25. Notification de changement de programme

**Objectif** : tenir les séquences de l'enseignant à jour quand le programme évolue.

**Ce que ça fait** : quand la base curriculaire est mise à jour, notifie l'enseignant concerné et propose de mettre à jour ses séquences existantes.

**Valeur** : maintien de la conformité dans le temps sans surveillance manuelle de l'enseignant.

**Apport client** : la veille humaine. Personne ne détecte automatiquement un changement ministériel — c'est le client/son équipe qui met à jour la base.

**Vigilance** : « mise à jour automatique en cas de changement ministériel » est impossible telle qu'imaginée. Le système réagit à une mise à jour MANUELLE de la base, il ne détecte rien côté ministère. À reformuler avec le client.

---

## 26. OCR manuscrit des copies

**Objectif** : permettre de corriger une copie manuscrite photographiée, sans tout retaper.

**Ce que ça fait** : reconnaissance du texte d'une copie manuscrite prise en photo. Le texte reconnu est éditable par l'enseignant avant analyse.

**Valeur** : étend la correction au manuscrit, qui reste la réalité de beaucoup de copies.

**Apport client** : 5 à 10 vraies copies d'élèves (manuscrites, variées : écriture soignée et brouillonne, maths, schémas) pour tester la fiabilité AVANT tout engagement ferme.

**Vigilance** : c'est le pari technique le plus risqué du projet. La reconnaissance de l'écriture d'élève réelle (ratures, maths, schémas, écriture penchée) donne des résultats inégaux. Ça impressionne en démo, ça peut décevoir en production. À valider sur échantillon réel avant de promettre.

---

## 27. Envoi réel + accusés de lecture

**Objectif** : envoyer effectivement les messages aux parents et savoir s'ils ont été lus.

**Ce que ça fait** : envoie le message par le canal choisi, fournit un accusé de lecture et un suivi des réponses, gère la délivrabilité.

**Valeur** : ferme la boucle de la communication parents.

**Apport client** : décision sur le canal — email, portail parent dédié, SMS ? C'est une décision produit qui change radicalement le périmètre. Plus le compte du service d'email et un domaine vérifié.

**Vigilance** : implique de l'infrastructure asynchrone et la gestion de la délivrabilité. Les accusés de lecture supposent un canal maîtrisé. C'est ici que se cache la vraie complexité du Module 3.

---

## 28. Alertes proactives (patterns préoccupants)

**Objectif** : repérer automatiquement les élèves en difficulté avant que la situation ne dégénère.

**Ce que ça fait** : détecte des signaux (absences répétées, notes en chute) et propose à l'enseignant d'envoyer un message préventif. L'enseignant valide avant tout envoi.

**Valeur** : passe d'une posture réactive à une posture préventive.

**Vigilance** : nécessite une infrastructure asynchrone (surveillance continue en arrière-plan), chantier séparé du moteur. Dépend des données du Module 5 (présences) et du Module 1 (notes). À traiter tardivement.

---

## 29. Saisie rapide présences / participation / observations

**Objectif** : capturer présences, participation et comportements en temps réel pendant le cours, sans perdre de temps.

**Ce que ça fait** : interface minimaliste, utilisable d'une seule main pendant qu'on enseigne — présences en quelques secondes, points de participation en un geste, observations rapides via icônes.

**Valeur** : récupère du temps de classe perdu et crée une mémoire objective de chaque élève.

**Apport client** : décision app mobile native vs version web mobile. Une première version web (utilisable sur téléphone via le navigateur) réduit énormément le risque et le coût.

**Vigilance** : le document décrit une app mobile native = un deuxième produit, avec sa propre technologie et son déploiement sur les stores. À lui seul, ce module peut peser autant que les quatre autres. À mettre en dernier ; commencer en web mobile et décider ensuite.

---

## 30. Synchronisation des données vers le bulletin

**Objectif** : alimenter le bulletin avec des faits objectifs plutôt qu'un souvenir flou.

**Ce que ça fait** : les données de participation et de comportement collectées (29) sont agrégées par élève et résumées au moment de la rédaction du bulletin.

**Valeur** : au lieu de se souvenir vaguement, l'enseignant dispose d'un résumé factuel par élève.

**Vigilance** : dépend de la saisie (29) et a un lien fort avec les commentaires (15).

---

## 31. Analytics de classe + groupes de travail

**Objectif** : visualiser l'engagement de la classe et faciliter la formation de groupes.

**Ce que ça fait** : tableau de bord d'engagement (semaine/mois), identification des élèves peu actifs à risque de décrochage, suggestion de groupes hétérogènes équilibrés.

**Valeur** : repère les décrocheurs tôt et facilite l'organisation d'activités collaboratives.

**Vigilance** : dépend entièrement des données collectées (29). Sans saisie, les analytics sont vides.

---

## 32. Tableau de bord enseignant unifié (vue 360°)

**Objectif** : tout voir sur un élève en un seul endroit.

**Ce que ça fait** : vue unifiée par élève (notes, comportement, communications, modules, plan d'intervention), agenda pédagogique (prévu / en retard / à corriger), indicateurs de charge de travail (copies à corriger, bulletins à rédiger, parents à contacter).

**Valeur** : c'est ce qui transforme 5 modules puissants en un produit indispensable et connecté.

**Vigilance** : n'a de sens qu'une fois plusieurs modules livrés, car il agrège leurs données. C'est la couche d'intégration, à faire en fin de parcours.

---

## 33. Bibliothèque de séquences collaboratives

**Objectif** : permettre aux enseignants de partager et noter leurs séquences.

**Ce que ça fait** : partage de séquences anonymisées avec les collègues de même matière/niveau, notation par les pairs, filtres par pays/programme/niveau.

**Valeur** : crée une rétention forte — les enseignants ne quittent pas une plateforme où leurs ressources et leur réseau sont stockés.

**Vigilance** : forte valeur de rétention mais non essentielle au cœur de valeur. À faire une fois le moteur de génération solide.

---

## 34. Intégrations LMS (Google Classroom, Teams, Moodle, Mozaïk)

**Objectif** : connecter la plateforme aux outils que l'enseignant utilise déjà.

**Ce que ça fait** : intégrations avec les plateformes existantes pour éviter la double saisie.

**Valeur** : réduit la friction d'adoption en s'insérant dans l'écosystème existant.

**Apport client** : la priorité des intégrations — laquelle compte vraiment pour les utilisateurs cibles ? On en fait une bien, pas cinq à moitié. Plus les comptes développeur Google Cloud / Microsoft (validation à sa charge).

**Vigilance** : chaque intégration est un chantier OAuth/API séparé, avec des validations parfois longues côté Google/Microsoft. Ce ne sont pas des cases à cocher. À reporter loin et traiter une par une.