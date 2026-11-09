-- Les jetons Google ne sont plus stockés en clair : ils sont chiffrés côté
-- serveur (AES-256-GCM, clé AI_CREDENTIALS_ENCRYPTION_KEY) avant écriture.
--
-- Les connexions existantes sont supprimées : elles contenaient des jetons en
-- clair. Chaque enseignant reconnecte Gmail/Drive une seule fois, depuis la
-- carte de l'agent ou la section « Connexion Google » des paramètres.

delete from public.google_integrations;

alter table public.google_integrations
  drop column access_token,
  drop column refresh_token,
  add column access_token_encrypted jsonb not null,
  add column refresh_token_encrypted jsonb not null;

notify pgrst, 'reload schema';
