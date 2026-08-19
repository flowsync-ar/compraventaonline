-- ------------------------------------------------------------
-- Import MercadoLibre Argentina's category taxonomy (root categories +
-- subcategories, matching the depth mercadolibre.com.ar/categorias itself
-- shows — 2 levels, same as our schema/UI support).
--
-- Safety approach: the 13 categories already in use (some referenced by
-- real products.category_id) are NEVER deleted or re-created — their id,
-- slug and name stay untouched, so no product loses its category. This
-- migration only ADDS: new root categories, new subcategories under both
-- new and existing roots, and one clean re-parent (see below).
--
-- The one exception: "Celulares" already exists as a subcategory of
-- "Electrónica", but MercadoLibre treats phones as their own root
-- ("Celulares y Teléfonos"), separate from "Electrónica, Audio y Video".
-- We create that new root and re-parent the EXISTING "Celulares" row onto
-- it (its id and slug don't change) — any product already using it (e.g.
-- an iPhone listing) stays correctly categorized with zero data loss.
-- ------------------------------------------------------------

-- ── New root categories ──────────────────────────────────────
INSERT INTO categories (name, slug, icon) VALUES
  ('Antigüedades y Colecciones',    'antiguedades-y-colecciones',    '🏺'),
  ('Arte, Papelería y Mercería',    'arte-papeleria-y-merceria',     '🎨'),
  ('Bebés',                         'bebes',                         '🍼'),
  ('Belleza y Cuidado Personal',    'belleza-y-cuidado-personal',    '💄'),
  ('Cámaras y Accesorios',          'camaras-y-accesorios',          '📷'),
  ('Celulares y Teléfonos',         'celulares-y-telefonos',         '📱'),
  ('Computación',                   'computacion',                   '🖥️'),
  ('Construcción',                  'construccion',                  '🧱'),
  ('Consolas y Videojuegos',        'consolas-y-videojuegos',        '🎮'),
  ('Electrodomésticos',             'electrodomesticos',             '🧺'),
  ('Herramientas',                  'herramientas',                  '🛠️'),
  ('Industrias y Oficinas',         'industrias-y-oficinas',         '🏭'),
  ('Joyas y Relojes',               'joyas-y-relojes',               '💍'),
  ('Juegos y Juguetes',             'juegos-y-juguetes',             '🧸'),
  ('Libros, Revistas y Comics',     'libros-revistas-y-comics',      '📚'),
  ('Música, Películas y Series',    'musica-peliculas-y-series',     '🎬'),
  ('Salud y Equipamiento Médico',   'salud-y-equipamiento-medico',   '🩺'),
  ('Souvenirs, Cotillón y Fiestas', 'souvenirs-cotillon-y-fiestas',  '🎉')
ON CONFLICT (slug) DO NOTHING;

-- ── Re-parent the existing "Celulares" subcategory onto the new
--    "Celulares y Teléfonos" root (was under "Electrónica") ──
UPDATE categories
SET parent_id = (SELECT id FROM categories WHERE slug = 'celulares-y-telefonos')
WHERE slug = 'celulares';

-- ── Subcategories — existing roots ───────────────────────────
INSERT INTO categories (name, slug, parent_id) VALUES
  ('Maquinaria Agrícola',   'maquinaria-agricola',   (SELECT id FROM categories WHERE slug = 'agro-y-ganaderia')),
  ('Insumos Agrícolas',     'insumos-agricolas',     (SELECT id FROM categories WHERE slug = 'agro-y-ganaderia')),
  ('Semillas y Fertilizantes', 'semillas-y-fertilizantes', (SELECT id FROM categories WHERE slug = 'agro-y-ganaderia')),
  ('Hacienda y Ganado',     'hacienda-y-ganado',     (SELECT id FROM categories WHERE slug = 'agro-y-ganaderia')),
  ('Riego Agrícola',        'riego-agricola',        (SELECT id FROM categories WHERE slug = 'agro-y-ganaderia')),

  ('Almacén',               'almacen',               (SELECT id FROM categories WHERE slug = 'alimentos-y-bebidas')),
  ('Quesos y Fiambres',     'quesos-y-fiambres',     (SELECT id FROM categories WHERE slug = 'alimentos-y-bebidas')),
  ('Dulces y Conservas',    'dulces-y-conservas',    (SELECT id FROM categories WHERE slug = 'alimentos-y-bebidas')),
  ('Bebidas sin Alcohol',   'bebidas-sin-alcohol',   (SELECT id FROM categories WHERE slug = 'alimentos-y-bebidas')),
  ('Cervezas Artesanales',  'cervezas-artesanales',  (SELECT id FROM categories WHERE slug = 'alimentos-y-bebidas')),

  ('Perros',                'perros',                (SELECT id FROM categories WHERE slug = 'animales-y-mascotas')),
  ('Gatos',                 'gatos',                 (SELECT id FROM categories WHERE slug = 'animales-y-mascotas')),
  ('Alimento para Mascotas', 'alimento-para-mascotas', (SELECT id FROM categories WHERE slug = 'animales-y-mascotas')),
  ('Accesorios para Mascotas', 'accesorios-para-mascotas', (SELECT id FROM categories WHERE slug = 'animales-y-mascotas')),
  ('Aves y Peces',          'aves-y-peces',          (SELECT id FROM categories WHERE slug = 'animales-y-mascotas')),

  ('Autos',                 'autos',                 (SELECT id FROM categories WHERE slug = 'autos-y-motos')),
  ('Motos',                 'motos',                 (SELECT id FROM categories WHERE slug = 'autos-y-motos')),
  ('Repuestos y Accesorios de Vehículos', 'repuestos-y-accesorios-vehiculos', (SELECT id FROM categories WHERE slug = 'autos-y-motos')),
  ('Neumáticos',            'neumaticos',            (SELECT id FROM categories WHERE slug = 'autos-y-motos')),
  ('Camiones y Utilitarios', 'camiones-y-utilitarios', (SELECT id FROM categories WHERE slug = 'autos-y-motos')),
  ('Náutica',               'nautica',               (SELECT id FROM categories WHERE slug = 'autos-y-motos')),

  ('Ciclismo',              'ciclismo',              (SELECT id FROM categories WHERE slug = 'deportes')),
  ('Fitness y Musculación', 'fitness-y-musculacion', (SELECT id FROM categories WHERE slug = 'deportes')),
  ('Fútbol',                'futbol',                (SELECT id FROM categories WHERE slug = 'deportes')),
  ('Camping y Aire Libre',  'camping-y-aire-libre',  (SELECT id FROM categories WHERE slug = 'deportes')),
  ('Pesca',                 'pesca',                 (SELECT id FROM categories WHERE slug = 'deportes')),
  ('Indumentaria Deportiva', 'indumentaria-deportiva', (SELECT id FROM categories WHERE slug = 'deportes')),

  ('Audio',                 'audio',                 (SELECT id FROM categories WHERE slug = 'electronica')),
  ('TV y Video',            'tv-y-video',            (SELECT id FROM categories WHERE slug = 'electronica')),
  ('Accesorios Electrónicos', 'accesorios-electronicos', (SELECT id FROM categories WHERE slug = 'electronica')),
  ('Domótica',              'domotica',              (SELECT id FROM categories WHERE slug = 'electronica')),

  ('Muebles',               'muebles',               (SELECT id FROM categories WHERE slug = 'hogar-y-jardin')),
  ('Jardín y Exterior',     'jardin-y-exterior',     (SELECT id FROM categories WHERE slug = 'hogar-y-jardin')),
  ('Decoración del Hogar',  'decoracion-del-hogar',  (SELECT id FROM categories WHERE slug = 'hogar-y-jardin')),
  ('Cocina y Comedor',      'cocina-y-comedor',      (SELECT id FROM categories WHERE slug = 'hogar-y-jardin')),
  ('Iluminación',           'iluminacion',           (SELECT id FROM categories WHERE slug = 'hogar-y-jardin')),
  ('Blanco y Textil de Hogar', 'blanco-y-textil-hogar', (SELECT id FROM categories WHERE slug = 'hogar-y-jardin')),

  ('Casas en Venta',        'casas-en-venta',        (SELECT id FROM categories WHERE slug = 'inmuebles')),
  ('Departamentos en Venta', 'departamentos-en-venta', (SELECT id FROM categories WHERE slug = 'inmuebles')),
  ('Terrenos y Lotes',      'terrenos-y-lotes',      (SELECT id FROM categories WHERE slug = 'inmuebles')),
  ('Locales y Oficinas',    'locales-y-oficinas',    (SELECT id FROM categories WHERE slug = 'inmuebles')),
  ('Alquileres Temporarios', 'alquileres-temporarios', (SELECT id FROM categories WHERE slug = 'inmuebles')),
  ('Campos',                'campos',                (SELECT id FROM categories WHERE slug = 'inmuebles')),

  ('Teclados y Pianos',     'teclados-y-pianos',     (SELECT id FROM categories WHERE slug = 'instrumentos-musicales')),
  ('Baterías y Percusión',  'baterias-y-percusion',  (SELECT id FROM categories WHERE slug = 'instrumentos-musicales')),
  ('Instrumentos de Viento', 'instrumentos-de-viento', (SELECT id FROM categories WHERE slug = 'instrumentos-musicales')),
  ('Amplificadores',        'amplificadores',        (SELECT id FROM categories WHERE slug = 'instrumentos-musicales')),
  ('Accesorios para Instrumentos', 'accesorios-para-instrumentos', (SELECT id FROM categories WHERE slug = 'instrumentos-musicales')),

  ('Varios',                'varios',                (SELECT id FROM categories WHERE slug = 'otros')),
  ('Sin Categorizar',       'sin-categorizar',       (SELECT id FROM categories WHERE slug = 'otros')),

  ('Ropa de Mujer',         'ropa-de-mujer',         (SELECT id FROM categories WHERE slug = 'ropa-y-accesorios')),
  ('Ropa de Hombre',        'ropa-de-hombre',        (SELECT id FROM categories WHERE slug = 'ropa-y-accesorios')),
  ('Calzado',               'calzado',               (SELECT id FROM categories WHERE slug = 'ropa-y-accesorios')),
  ('Carteras y Mochilas',   'carteras-y-mochilas',   (SELECT id FROM categories WHERE slug = 'ropa-y-accesorios')),
  ('Ropa de Niños',         'ropa-de-ninos',         (SELECT id FROM categories WHERE slug = 'ropa-y-accesorios')),
  ('Accesorios de Moda',    'accesorios-de-moda',    (SELECT id FROM categories WHERE slug = 'ropa-y-accesorios')),

  ('Construcción y Reformas', 'construccion-y-reformas', (SELECT id FROM categories WHERE slug = 'servicios')),
  ('Clases y Cursos',       'clases-y-cursos',       (SELECT id FROM categories WHERE slug = 'servicios')),
  ('Eventos y Fiestas',     'eventos-y-fiestas',     (SELECT id FROM categories WHERE slug = 'servicios')),
  ('Limpieza',              'limpieza',              (SELECT id FROM categories WHERE slug = 'servicios')),
  ('Transporte y Fletes',   'transporte-y-fletes',   (SELECT id FROM categories WHERE slug = 'servicios')),
  ('Belleza y Estética',    'belleza-y-estetica',    (SELECT id FROM categories WHERE slug = 'servicios')),

  ('Full Time',             'full-time',             (SELECT id FROM categories WHERE slug = 'trabajo-y-empleo')),
  ('Part Time',             'part-time',             (SELECT id FROM categories WHERE slug = 'trabajo-y-empleo')),
  ('Freelance',             'freelance',             (SELECT id FROM categories WHERE slug = 'trabajo-y-empleo')),
  ('Changas',               'changas',               (SELECT id FROM categories WHERE slug = 'trabajo-y-empleo'))
ON CONFLICT (slug) DO NOTHING;

-- ── Subcategories — new roots ────────────────────────────────
INSERT INTO categories (name, slug, parent_id) VALUES
  ('Antigüedades',          'antiguedades',          (SELECT id FROM categories WHERE slug = 'antiguedades-y-colecciones')),
  ('Monedas y Billetes',    'monedas-y-billetes',    (SELECT id FROM categories WHERE slug = 'antiguedades-y-colecciones')),
  ('Figuras de Colección',  'figuras-de-coleccion',  (SELECT id FROM categories WHERE slug = 'antiguedades-y-colecciones')),
  ('Estampillas',           'estampillas',           (SELECT id FROM categories WHERE slug = 'antiguedades-y-colecciones')),

  ('Materiales de Arte',    'materiales-de-arte',    (SELECT id FROM categories WHERE slug = 'arte-papeleria-y-merceria')),
  ('Papelería',             'papeleria',             (SELECT id FROM categories WHERE slug = 'arte-papeleria-y-merceria')),
  ('Mercería',              'merceria',              (SELECT id FROM categories WHERE slug = 'arte-papeleria-y-merceria')),
  ('Manualidades',          'manualidades',          (SELECT id FROM categories WHERE slug = 'arte-papeleria-y-merceria')),

  ('Cochecitos',            'cochecitos',            (SELECT id FROM categories WHERE slug = 'bebes')),
  ('Sillas de Auto para Bebés', 'sillas-de-auto-bebes', (SELECT id FROM categories WHERE slug = 'bebes')),
  ('Ropa de Bebé',          'ropa-de-bebe',          (SELECT id FROM categories WHERE slug = 'bebes')),
  ('Alimentación del Bebé', 'alimentacion-del-bebe', (SELECT id FROM categories WHERE slug = 'bebes')),
  ('Juguetes para Bebés',   'juguetes-para-bebes',   (SELECT id FROM categories WHERE slug = 'bebes')),

  ('Maquillaje',            'maquillaje',            (SELECT id FROM categories WHERE slug = 'belleza-y-cuidado-personal')),
  ('Perfumes',              'perfumes',              (SELECT id FROM categories WHERE slug = 'belleza-y-cuidado-personal')),
  ('Cuidado de la Piel',    'cuidado-de-la-piel',    (SELECT id FROM categories WHERE slug = 'belleza-y-cuidado-personal')),
  ('Cuidado del Cabello',   'cuidado-del-cabello',   (SELECT id FROM categories WHERE slug = 'belleza-y-cuidado-personal')),
  ('Cuidado Personal Hombre', 'cuidado-personal-hombre', (SELECT id FROM categories WHERE slug = 'belleza-y-cuidado-personal')),

  ('Cámaras Digitales',     'camaras-digitales',     (SELECT id FROM categories WHERE slug = 'camaras-y-accesorios')),
  ('Lentes Fotográficos',   'lentes-fotograficos',   (SELECT id FROM categories WHERE slug = 'camaras-y-accesorios')),
  ('Drones',                'drones',                (SELECT id FROM categories WHERE slug = 'camaras-y-accesorios')),
  ('Accesorios Fotográficos', 'accesorios-fotograficos', (SELECT id FROM categories WHERE slug = 'camaras-y-accesorios')),

  ('Accesorios para Celulares', 'accesorios-para-celulares', (SELECT id FROM categories WHERE slug = 'celulares-y-telefonos')),
  ('Smartwatches',          'smartwatches',          (SELECT id FROM categories WHERE slug = 'celulares-y-telefonos')),
  ('Tablets',               'tablets',               (SELECT id FROM categories WHERE slug = 'celulares-y-telefonos')),

  ('Notebooks',             'notebooks',             (SELECT id FROM categories WHERE slug = 'computacion')),
  ('PC de Escritorio',      'pc-de-escritorio',      (SELECT id FROM categories WHERE slug = 'computacion')),
  ('Monitores',             'monitores',             (SELECT id FROM categories WHERE slug = 'computacion')),
  ('Componentes de PC',     'componentes-de-pc',     (SELECT id FROM categories WHERE slug = 'computacion')),
  ('Impresoras',            'impresoras',            (SELECT id FROM categories WHERE slug = 'computacion')),
  ('Almacenamiento y Pendrives', 'almacenamiento-y-pendrives', (SELECT id FROM categories WHERE slug = 'computacion')),

  ('Materiales de Construcción', 'materiales-de-construccion', (SELECT id FROM categories WHERE slug = 'construccion')),
  ('Pinturas',              'pinturas',              (SELECT id FROM categories WHERE slug = 'construccion')),
  ('Sanitarios y Griferías', 'sanitarios-y-griferias', (SELECT id FROM categories WHERE slug = 'construccion')),
  ('Electricidad',          'electricidad',          (SELECT id FROM categories WHERE slug = 'construccion')),
  ('Herrajes',              'herrajes',              (SELECT id FROM categories WHERE slug = 'construccion')),

  ('PlayStation',           'playstation',           (SELECT id FROM categories WHERE slug = 'consolas-y-videojuegos')),
  ('Xbox',                  'xbox',                  (SELECT id FROM categories WHERE slug = 'consolas-y-videojuegos')),
  ('Nintendo',              'nintendo',              (SELECT id FROM categories WHERE slug = 'consolas-y-videojuegos')),
  ('Juegos de PC',          'juegos-de-pc',          (SELECT id FROM categories WHERE slug = 'consolas-y-videojuegos')),
  ('Accesorios Gamer',      'accesorios-gamer',      (SELECT id FROM categories WHERE slug = 'consolas-y-videojuegos')),

  ('Heladeras',             'heladeras',             (SELECT id FROM categories WHERE slug = 'electrodomesticos')),
  ('Lavarropas',            'lavarropas',            (SELECT id FROM categories WHERE slug = 'electrodomesticos')),
  ('Cocinas y Hornos',      'cocinas-y-hornos',      (SELECT id FROM categories WHERE slug = 'electrodomesticos')),
  ('Microondas',            'microondas',            (SELECT id FROM categories WHERE slug = 'electrodomesticos')),
  ('Aires Acondicionados',  'aires-acondicionados',  (SELECT id FROM categories WHERE slug = 'electrodomesticos')),
  ('Pequeños Electrodomésticos', 'pequenos-electrodomesticos', (SELECT id FROM categories WHERE slug = 'electrodomesticos')),

  ('Herramientas Eléctricas', 'herramientas-electricas', (SELECT id FROM categories WHERE slug = 'herramientas')),
  ('Herramientas Manuales', 'herramientas-manuales', (SELECT id FROM categories WHERE slug = 'herramientas')),
  ('Máquinas y Equipos',    'maquinas-y-equipos',    (SELECT id FROM categories WHERE slug = 'herramientas')),
  ('Seguridad Industrial',  'seguridad-industrial',  (SELECT id FROM categories WHERE slug = 'herramientas')),

  ('Maquinaria Industrial', 'maquinaria-industrial', (SELECT id FROM categories WHERE slug = 'industrias-y-oficinas')),
  ('Muebles de Oficina',    'muebles-de-oficina',    (SELECT id FROM categories WHERE slug = 'industrias-y-oficinas')),
  ('Insumos de Oficina',    'insumos-de-oficina',    (SELECT id FROM categories WHERE slug = 'industrias-y-oficinas')),
  ('Gastronomía y Hotelería', 'gastronomia-y-hoteleria', (SELECT id FROM categories WHERE slug = 'industrias-y-oficinas')),

  ('Anillos',               'anillos',               (SELECT id FROM categories WHERE slug = 'joyas-y-relojes')),
  ('Relojes',               'relojes',               (SELECT id FROM categories WHERE slug = 'joyas-y-relojes')),
  ('Aros y Collares',       'aros-y-collares',       (SELECT id FROM categories WHERE slug = 'joyas-y-relojes')),
  ('Joyas de Plata y Oro',  'joyas-de-plata-y-oro',  (SELECT id FROM categories WHERE slug = 'joyas-y-relojes')),

  ('Muñecas',               'munecas',               (SELECT id FROM categories WHERE slug = 'juegos-y-juguetes')),
  ('Juegos de Mesa',        'juegos-de-mesa',        (SELECT id FROM categories WHERE slug = 'juegos-y-juguetes')),
  ('Juegos Didácticos',     'juegos-didacticos',     (SELECT id FROM categories WHERE slug = 'juegos-y-juguetes')),
  ('Bloques y Construcción', 'bloques-y-construccion', (SELECT id FROM categories WHERE slug = 'juegos-y-juguetes')),
  ('Peluches',              'peluches',              (SELECT id FROM categories WHERE slug = 'juegos-y-juguetes')),

  ('Libros',                'libros',                (SELECT id FROM categories WHERE slug = 'libros-revistas-y-comics')),
  ('Comics y Manga',        'comics-y-manga',        (SELECT id FROM categories WHERE slug = 'libros-revistas-y-comics')),
  ('Revistas',              'revistas',              (SELECT id FROM categories WHERE slug = 'libros-revistas-y-comics')),
  ('Libros Escolares',      'libros-escolares',      (SELECT id FROM categories WHERE slug = 'libros-revistas-y-comics')),

  ('Vinilos',               'vinilos',               (SELECT id FROM categories WHERE slug = 'musica-peliculas-y-series')),
  ('CDs de Música',         'cds-de-musica',         (SELECT id FROM categories WHERE slug = 'musica-peliculas-y-series')),
  ('DVD y Blu-ray',         'dvd-y-blu-ray',         (SELECT id FROM categories WHERE slug = 'musica-peliculas-y-series')),
  ('Merchandising',         'merchandising',         (SELECT id FROM categories WHERE slug = 'musica-peliculas-y-series')),

  ('Equipamiento Médico',   'equipamiento-medico',   (SELECT id FROM categories WHERE slug = 'salud-y-equipamiento-medico')),
  ('Suplementos Dietarios', 'suplementos-dietarios', (SELECT id FROM categories WHERE slug = 'salud-y-equipamiento-medico')),
  ('Ortopedia',             'ortopedia',             (SELECT id FROM categories WHERE slug = 'salud-y-equipamiento-medico')),
  ('Cuidado del Adulto Mayor', 'cuidado-del-adulto-mayor', (SELECT id FROM categories WHERE slug = 'salud-y-equipamiento-medico')),

  ('Cotillón',              'cotillon',              (SELECT id FROM categories WHERE slug = 'souvenirs-cotillon-y-fiestas')),
  ('Globos',                'globos',                (SELECT id FROM categories WHERE slug = 'souvenirs-cotillon-y-fiestas')),
  ('Artículos para Cumpleaños', 'articulos-para-cumpleanos', (SELECT id FROM categories WHERE slug = 'souvenirs-cotillon-y-fiestas')),
  ('Decoración de Fiestas', 'decoracion-de-fiestas', (SELECT id FROM categories WHERE slug = 'souvenirs-cotillon-y-fiestas'))
ON CONFLICT (slug) DO NOTHING;
