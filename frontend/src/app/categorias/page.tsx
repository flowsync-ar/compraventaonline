import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { fetchAllCategories, buildChildrenMap } from "@/lib/categories";

type SubcategoryView = {
  id: string;
  name: string;
  slug: string;
  hasChildren: boolean;
};

type CategoryTreeItem = {
  id: string;
  name: string;
  slug: string;
  subcategories: SubcategoryView[];
};

async function getCategoryTree(): Promise<CategoryTreeItem[]> {
  const supabase = await createClient();
  const categories = await fetchAllCategories(supabase);
  if (categories.length === 0) return [];

  const roots = categories.filter((cat) => cat.parent_id === null);
  const childrenByParentId = buildChildrenMap(categories);

  return roots.map((root) => ({
    id: root.id,
    name: root.name,
    slug: root.slug,
    subcategories: (childrenByParentId.get(root.id) ?? []).map((sub) => ({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      // A subcategory with its own children (sub-subcategories, matching
      // MercadoLibre's real 3rd level) drills into /categorias/[slug]
      // instead of going straight to search results.
      hasChildren: (childrenByParentId.get(sub.id) ?? []).length > 0,
    })),
  }));
}

export default async function CategoriasPage() {
  const categories = await getCategoryTree();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full flex flex-col gap-8">

      {/* Title Header */}
      <div className="border-b border-card-border pb-6">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Categorías
        </h1>
        <p className="text-text-muted text-xs mt-2 leading-relaxed max-w-2xl">
          Explorá todas las categorías del marketplace y encontrá exactamente lo que buscás en La Pampa.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-card-border rounded-3xl flex flex-col items-center gap-2">
          <span className="text-4xl">📭</span>
          <h3 className="font-heading text-sm font-bold text-foreground mt-2">No hay categorías disponibles</h3>
          <p className="text-text-muted text-xs">
            Todavía no se cargaron categorías en el marketplace.
          </p>
        </div>
      ) : (
        // Sitemap-style layout (MercadoLibre "Categorías" page): plain text,
        // no icons/cards. CSS multi-column flow (not a grid) so each block
        // takes only the vertical space its subcategory list needs, and the
        // next block starts right below it in the same column — a strict
        // grid would leave awkward gaps next to short categories.
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-x-10">
          {categories.map((category) => (
            <div key={category.id} className="break-inside-avoid mb-7">
              <Link
                href={`/search?category=${category.slug}`}
                className="text-[13px] font-extrabold text-foreground hover:text-accent-gold transition-colors"
              >
                {category.name}
              </Link>

              {category.subcategories.length > 0 && (
                <ul className="flex flex-col gap-1.5 mt-2">
                  {category.subcategories.map((sub) => (
                    <li key={sub.id}>
                      <Link
                        href={sub.hasChildren ? `/categorias/${sub.slug}` : `/search?category=${sub.slug}`}
                        className="text-xs text-text-muted hover:text-accent-gold transition-colors"
                      >
                        {sub.name}
                        {sub.hasChildren && <span className="text-text-muted/50"> ›</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
