-- ============================================================
-- Seed data for CompraVentaOnline
-- Run this AFTER migrations 001 and 002.
-- Uses service_role (SQL Editor in Supabase dashboard).
-- ============================================================

-- ------------------------------------------------------------
-- Fake auth users (service_role only)
-- ------------------------------------------------------------

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_user_meta_data, role, aud
) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'ferreteria@example.com', '', now(), now(), now(),
    '{"full_name": "Ferretería El Pampeano"}'::jsonb,
    'authenticated', 'authenticated'
  ),
  
  (
    'a0000000-0000-0000-0000-000000000003',
    'motoventa@example.com', '', now(), now(), now(),
    '{"full_name": "Moto Centro Pico"}'::jsonb,
    'authenticated', 'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- The trigger handle_new_user creates the seller rows automatically.
-- We update them here to set score and tier.

UPDATE sellers SET
  score = 95, tier = 'GOLD',    location = 'General Pico, La Pampa', bio = 'Ferretería mayorista con más de 20 años en el rubro.'
WHERE user_id = 'a0000000-0000-0000-0000-000000000001';

UPDATE sellers SET
  score = 98, tier = 'PREMIUM', location = 'Santa Rosa, La Pampa',   bio = 'Productores de miel artesanal del caldenal pampeano.'
WHERE user_id = 'a0000000-0000-0000-0000-000000000002';

UPDATE sellers SET
  score = 92, tier = 'PLATA',   location = 'General Pico, La Pampa', bio = 'Concesionario oficial Honda en La Pampa.'
WHERE user_id = 'a0000000-0000-0000-0000-000000000003';

-- ------------------------------------------------------------
-- Products
-- ------------------------------------------------------------

INSERT INTO products (id, name, brand, description, images, category_id) VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'Taladro Percutor 500W',
    'Bosch',
    'Taladro percutor Bosch GSB 13 RE Professional. Potente motor de 500 W con percusión regulable.',
    ARRAY['https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=600&auto=format&fit=crop'],
    (SELECT id FROM categories WHERE slug = 'otros')
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Amoladora Angular 115mm',
    'DeWalt',
    'Amoladora angular 850W con disco de 115mm. Ideal para corte y desbaste en metal y mampostería.',
    ARRAY['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?q=80&w=600&auto=format&fit=crop'],
    (SELECT id FROM categories WHERE slug = 'otros')
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Miel Orgánica Pura del Caldenal',
    'Pampeana Alta',
    'Miel pura de abeja de flores silvestres cosechada en el caldenal pampeano. 500g.',
    ARRAY['https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=600&auto=format&fit=crop'],
    (SELECT id FROM categories WHERE slug = 'alimentos-y-bebidas')
  ),
  
  (
    'b0000000-0000-0000-0000-000000000005',
    'Honda Wave 110S',
    'Honda',
    'Excelente estado, único dueño, 5000 km, papeles listos para transferir.',
    ARRAY['https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600&auto=format&fit=crop'],
    (SELECT id FROM categories WHERE slug = 'autos-y-vehiculos')
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'Sillón Retro Tapizado Pana Verde',
    'Vintage',
    'Sillón de un cuerpo estilo retro vintage años 70. Tapizado en pana verde musgo. Sin manchas.',
    ARRAY['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?q=80&w=600&auto=format&fit=crop'],
    (SELECT id FROM categories WHERE slug = 'hogar-y-jardin')
  ),
  (
    'b0000000-0000-0000-0000-000000000007',
    'iPhone 14 128GB Medianoche',
    'Apple',
    'iPhone 14 128GB color medianoche. Con caja, accesorios originales y 6 meses de uso.',
    ARRAY['https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?q=80&w=600&auto=format&fit=crop'],
    (SELECT id FROM categories WHERE slug = 'electronica')
  ),
  (
    'b0000000-0000-0000-0000-000000000008',
    'Bicicleta MTB Rodado 29',
    'Trek',
    'Mountain bike rodado 29, frenos hidráulicos, suspensión delantera. Poco uso.',
    ARRAY['https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?q=80&w=600&auto=format&fit=crop'],
    (SELECT id FROM categories WHERE slug = 'deportes')
  )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Listings
-- ------------------------------------------------------------

INSERT INTO listings (id, seller_id, product_id, currency_id, price, stock, status, condition, featured_plan) VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    (SELECT id FROM sellers WHERE user_id = 'a0000000-0000-0000-0000-000000000001'),
    'b0000000-0000-0000-0000-000000000001',
    (SELECT id FROM currencies WHERE code = 'ARS'),
    125000.00, 5, 'APPROVED', 'NEW', 'FEATURED'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    (SELECT id FROM sellers WHERE user_id = 'a0000000-0000-0000-0000-000000000001'),
    'b0000000-0000-0000-0000-000000000002',
    (SELECT id FROM currencies WHERE code = 'ARS'),
    89000.00, 3, 'APPROVED', 'NEW', 'FREE'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    (SELECT id FROM sellers WHERE user_id = 'a0000000-0000-0000-0000-000000000002'),
    'b0000000-0000-0000-0000-000000000003',
    (SELECT id FROM currencies WHERE code = 'ARS'),
    18500.00, 20, 'APPROVED', 'NEW', 'PREMIUM'
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    (SELECT id FROM sellers WHERE user_id = 'a0000000-0000-0000-0000-000000000002'),
    'b0000000-0000-0000-0000-000000000004',
    (SELECT id FROM currencies WHERE code = 'ARS'),
    11000.00, 15, 'APPROVED', 'NEW', 'FREE'
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    (SELECT id FROM sellers WHERE user_id = 'a0000000-0000-0000-0000-000000000003'),
    'b0000000-0000-0000-0000-000000000005',
    (SELECT id FROM currencies WHERE code = 'ARS'),
    980000.00, 1, 'APPROVED', 'USED', 'PREMIUM'
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    (SELECT id FROM sellers WHERE user_id = 'a0000000-0000-0000-0000-000000000001'),
    'b0000000-0000-0000-0000-000000000006',
    (SELECT id FROM currencies WHERE code = 'ARS'),
    85000.00, 1, 'APPROVED', 'USED', 'FREE'
  ),
  (
    'c0000000-0000-0000-0000-000000000007',
    (SELECT id FROM sellers WHERE user_id = 'a0000000-0000-0000-0000-000000000003'),
    'b0000000-0000-0000-0000-000000000007',
    (SELECT id FROM currencies WHERE code = 'ARS'),
    850000.00, 1, 'APPROVED', 'USED', 'FEATURED'
  ),
  (
    'c0000000-0000-0000-0000-000000000008',
    (SELECT id FROM sellers WHERE user_id = 'a0000000-0000-0000-0000-000000000002'),
    'b0000000-0000-0000-0000-000000000008',
    (SELECT id FROM currencies WHERE code = 'ARS'),
    320000.00, 1, 'APPROVED', 'USED', 'FREE'
  )
ON CONFLICT (id) DO NOTHING;
