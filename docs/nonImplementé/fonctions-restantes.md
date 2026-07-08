# Fonctions restantes a implementer

Ce dossier liste les fonctions du cahier des charges qui ne sont pas implementees ou qui restent partielles. Le terme "restant" inclut aussi les placeholders et les interfaces non branchees a une logique metier reelle.

## Priorite MVP immediate

1. **Brancher le moteur de generation zero-prompt**
   - Remplir `generationSchema`.
   - Deplacer la logique metier hors `app/api/generate`.
   - Construire `buildCoursePrompt`.
   - Appeler LiteLLM/Claude avec le profil enseignant.
   - Persister les generations.

2. **Ajouter le streaming LLM**
   - Stream server-side dans la route API.
   - Affichage progressif dans `GenerationViewer`.
   - Gestion des erreurs, annulation et retry.

3. **Implementer les exports PDF/DOCX**
   - Remplacer `buildPdf()` et `buildDocx()` qui retournent actuellement `null`.
   - Gerer la mise en page DYS.
   - Brancher `src/app/api/export/route.ts`.

4. **Implementer le freemium gate**
   - Table de comptage generations.
   - Incrementation transactionnelle apres succes.
   - Blocage serveur a 3 generations.
   - Reset mensuel.
   - UI de limite connectee aux vraies donnees.

## Module 1 - Correction IA

- Import de copies dedie au module correction.
- Analyse de copie.
- Detection et classification d'erreurs.
- Commentaires personnalises par eleve avec 3 tons.
- Grilles de competences officielles.
- Tableau recapitulatif de classe par objectifs.
- Historique des corrections validees.

## Module 2 - Adapte Lecon

- Generation des 5 variantes : Standard, Soutien, DYS, TDAH, Enrichissement.
- Schema de variantes.
- Prompt builder `buildVariantPrompt`.
- Banque de ressources adaptees.
- Reutilisation d'adaptations existantes.
- Partage securise de ressources adaptees.
- Connexion des profils eleves aux adaptations automatiques.

## Module 3 - Communication parents

- Generateur de messages parents par etiquettes.
- Modeles reutilisables par situation.
- Ton configurable.
- Traduction automatique dans la langue parent.
- Historique des communications par eleve.
- Export PDF du dossier communication.
- Envoi reel email/SMS/portail.
- Accuses de lecture.
- Suivi des reponses.
- Alertes proactives sur patterns preoccupants.

## Module 4 - Planification Pro

- Base curriculaire officielle.
- Structure pays/province/niveau/matiere/competences.
- Alignement automatique des sequences sur curriculum.
- Calendrier pedagogique local.
- Alertes de retard de couverture.
- Notification de changement de programme apres mise a jour manuelle de la base.
- Bibliotheque de sequences collaboratives.

## Module 5 - Tableau / Classroom

- Verifier et finaliser la persistance complete des sessions de classe.
- Saisie presence utilisable en quelques secondes sur mobile.
- Participation en un geste.
- Observations rapides par icones.
- Aggregation participation/comportement par eleve.
- Synchronisation des faits vers le bulletin.
- Analytics hebdomadaires/mensuels d'engagement.
- Suggestion de groupes de travail.
- Vue 360 eleve regroupant notes, comportements, communications, adaptations et plan d'intervention.

## Monetisation et croissance

- Checkout Stripe reel.
- Webhooks Stripe complets.
- Etats d'abonnement.
- 4 paliers Starter/Pro/Etablissement/District.
- Gestion organisations pour Etablissement/District.
- Parrainage avec lien unique.
- Attribution automatique d'un mois offert.

## Integrations et partage

- Generation de liens de partage reels.
- Permissions et expiration des liens.
- Integrations LMS : Google Classroom, Teams, Moodle, Mozaik.
- Choisir une integration prioritaire avant tout developpement.

## Technique transverse

- Sortir la logique metier restante de `app/api/*` vers `features/*`.
- Ajouter tests d'integration Supabase avec RLS.
- Ajouter tests composants pour onboarding, documents, classroom.
- Appliquer la migration Supabase `007_teacher_profiles_subjects_live_repair.sql` sur la base live.
- Remplacer les donnees statiques dashboard/historique par des donnees persistantes.
