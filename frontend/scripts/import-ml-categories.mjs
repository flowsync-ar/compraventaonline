// Importa categorías de Mercado Libre (MLA) a `categories`.
// No borra ni renombra las que ya existen: si el slug o el nombre
// ya está, reutiliza esa fila y sigue bajando hijos debajo.
//
// Dónde: este archivo (junto a los otros one-off de frontend/scripts).
// Cómo (desde frontend/, con .env.local):
//
//   export MELI_ACCESS_TOKEN="APP_USR-..."
//   npm run import-ml-categories -- --depth=2
//   npm run import-ml-categories -- --depth=2 --apply
//
// Sin --apply solo lista lo que haría. --depth=2 = raíz + 2 niveles
// (como las migraciones 012/013). --depth=0 baja el árbol entero (lento).

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const depthArg = args.find((a) => a.startsWith("--depth="));
const maxDepth = depthArg ? Number(depthArg.split("=")[1]) : 2;

const token = process.env.MELI_ACCESS_TOKEN?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!token) {
  console.error("Falta MELI_ACCESS_TOKEN. Exportalo y volvé a correr.");
  process.exit(1);
}
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (usá --env-file=.env.local).");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

async function meli(path) {
  const res = await fetch(`https://api.mercadolibre.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ML ${path} → ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { data: existing, error } = await admin.from("categories").select("id, name, slug, parent_id");
  if (error) throw error;

  const bySlug = new Map((existing ?? []).map((c) => [c.slug, c]));
  const byName = new Map((existing ?? []).map((c) => [c.name.toLowerCase(), c]));

  let created = 0;
  let reused = 0;
  let skippedDepth = 0;

  async function ensureCategory(name, mlId, parentId) {
    const baseSlug = slugify(name) || slugify(mlId);
    const existingBySlug = bySlug.get(baseSlug);
    if (existingBySlug) {
      reused += 1;
      return existingBySlug.id;
    }
    const existingByName = byName.get(name.toLowerCase());
    if (existingByName) {
      reused += 1;
      return existingByName.id;
    }

    let slug = baseSlug;
    let displayName = name;
    let n = 2;
    while (bySlug.has(slug)) {
      slug = `${baseSlug}-${mlId.toLowerCase()}`.slice(0, 80);
      break;
    }
    if (byName.has(displayName.toLowerCase())) {
      displayName = `${name} (${mlId})`;
    }
    while (byName.has(displayName.toLowerCase())) {
      displayName = `${name} (${mlId}-${n++})`;
    }

    if (!apply) {
      const fakeId = `dry-${mlId}`;
      bySlug.set(slug, { id: fakeId, name: displayName, slug, parent_id: parentId });
      byName.set(displayName.toLowerCase(), { id: fakeId, name: displayName, slug, parent_id: parentId });
      created += 1;
      console.log(`  [dry] + ${displayName}  (${slug})`);
      return fakeId;
    }

    const { data, error: insertError } = await admin
      .from("categories")
      .insert({ name: displayName, slug, parent_id: parentId, icon: null })
      .select("id, name, slug, parent_id")
      .single();

    if (insertError) {
      console.error(`  ! no se pudo crear "${displayName}": ${insertError.message}`);
      return null;
    }

    bySlug.set(data.slug, data);
    byName.set(data.name.toLowerCase(), data);
    created += 1;
    console.log(`  + ${data.name}`);
    return data.id;
  }

  async function walk(mlId, parentId, depth) {
    if (maxDepth > 0 && depth > maxDepth) {
      skippedDepth += 1;
      return;
    }

    const data = await meli(`/categories/${mlId}`);
    await sleep(120);

    const ourId = await ensureCategory(data.name, data.id, parentId);
    if (!ourId) return;

    for (const child of data.children_categories ?? []) {
      await walk(child.id, ourId, depth + 1);
    }
  }

  console.log(apply ? "MODO APPLY — va a escribir en la base" : "MODO DRY-RUN — no escribe nada (agregá --apply)");
  console.log(`Profundidad máxima: ${maxDepth === 0 ? "sin límite" : maxDepth}\n`);

  const roots = await meli("/sites/MLA/categories");
  console.log(`Raíces MLA: ${roots.length}\n`);

  for (const root of roots) {
    console.log(`→ ${root.name} (${root.id})`);
    await walk(root.id, null, 1);
  }

  console.log(`\nListo. Creadas: ${created}  Reutilizadas: ${reused}  Cortadas por depth: ${skippedDepth}`);
  if (!apply) console.log("Si está bien, corré de nuevo con --apply");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
