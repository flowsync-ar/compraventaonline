-- ------------------------------------------------------------
-- The initial seed (001_initial.sql) gave USD the symbol 'U$D'. The user
-- wants the standard 'US$' prefix instead (e.g. "US$ 810"), matching how
-- USD prices are conventionally shown in Argentina.
-- ------------------------------------------------------------

UPDATE currencies SET symbol = 'US$' WHERE code = 'USD';
