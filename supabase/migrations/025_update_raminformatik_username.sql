-- ------------------------------------------------------------
-- One-time username change, requested directly by the account owner.
-- Scoped by email so it only ever touches this one seller row.
-- ------------------------------------------------------------

UPDATE sellers SET username = 'raminformatica' WHERE email = 'raminformatik@gmail.com';
