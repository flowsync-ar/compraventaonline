import Link from "next/link";
import { notFound } from "next/navigation";
import { getCachedCategories, buildChildrenMap, getAncestors } from "@/lib/categories";

// Generic "drill into a category" page — handles ANY depth (subcategory,
// sub-subcategory, and beyond), matching MercadoLibre's real behavior:
// picking a category that itself has children shows those children next;
// picking one with none goes straight to a filtered listing page. This is
// the same route file regardless of how deep you are — a child of THIS
// category that itself has children just links back into this same route
// with its own slug.
export default async function CategoriaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categories = await getCachedCategories();

  const current = categories.find((c) => c.slug === slug);
  if (!current) notFound();

  const ancestors = getAncestors(categories, current.id);
  const childrenByParentId = buildChildrenMap(categories);
  const children = childrenByParentId.get(current.id) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 w-full flex flex-col gap-6">

      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
        <Link href="/categorias" className="hover:text-accent-gold transition-colors">
          Categorías
        </Link>
        {ancestors.map((ancestor) => (
          <span key={ancestor.id} className="flex items-center gap-1.5">
            <span className="text-text-muted/50">/</span>
            <Link href={`/categorias/${ancestor.slug}`} className="hover:text-accent-gold transition-colors">
              {ancestor.name}
            </Link>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="text-text-muted/50">/</span>
          <span className="text-foreground font-semibold">{current.name}</span>
        </span>
      </nav>

      <div className="border-b border-card-border pb-6">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          {current.name}
        </h1>
      </div>

      {children.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-extrabold text-foreground uppercase tracking-wide">Categorías</h2>
          <ul className="columns-2 sm:columns-3 gap-x-10">
            {children.map((child) => {
              const childHasChildren = (childrenByParentId.get(child.id) ?? []).length > 0;
              return (
                <li key={child.id} className="break-inside-avoid mb-2">
                  <Link
                    href={childHasChildren ? `/categorias/${child.slug}` : `/search?category=${child.slug}`}
                    className="text-sm text-text-muted hover:text-accent-gold transition-colors"
                  >
                    {child.name}
                    {childHasChildren && <span className="text-text-muted/50"> ›</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Always available — some products may be tagged directly at this
          level even when it also has its own subcategories. Search
          filtering matches this slug plus every descendant, so it's never
          an empty promise even for a mid-level category. */}
      <Link
        href={`/search?category=${current.slug}`}
        className="self-start rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:opacity-90 transition-all"
      >
        Ver publicaciones de {current.name} →
      </Link>

    </div>
  );
}
