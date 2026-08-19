-- ------------------------------------------------------------
-- One-time backfill: every seller created before 014_username_and_avatar.sql
-- has username = NULL (the column didn't exist yet at signup time). Assign
-- the two accounts the user asked for by name; everyone else stays NULL
-- until they set one themselves (from "Mis Datos" once that becomes
-- editable, or by re-registering isn't applicable here — existing accounts
-- just don't have a username yet, same as any optional field).
-- ------------------------------------------------------------

UPDATE sellers SET username = 'raminformatica' WHERE email = 'raminformatik@gmail.com' AND username IS NULL;
UPDATE sellers SET username = 'ramirotule'     WHERE email = 'ramirotule@gmail.com'     AND username IS NULL;
