"use client";

import { useMemo, useState } from "react";
import CustomDropdown from "./CustomDropdown";

interface Category {
  name: string;
  slug: string;
  parentSlug?: string | null;
}

interface Props {
  categories: Category[];
  defaultCategory: string;
  defaultSubcategory: string;
}

interface DropdownOpt {
  name: string;
  value: string;
  groupLabel?: string;
}

function byParentMap(categories: Category[]): Map<string, Category[]> {
  const map = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.slug || !c.parentSlug) continue;
    const siblings = map.get(c.parentSlug) ?? [];
    siblings.push(c);
    map.set(c.parentSlug, siblings);
  }
  return map;
}

function descendantsOf(categories: Category[], parentSlug: string): Category[] {
  const children = byParentMap(categories);
  const result: Category[] = [];
  const queue = [...(children.get(parentSlug) ?? [])];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    queue.push(...(children.get(node.slug) ?? []));
  }
  return result;
}

function pathLabels(categories: Category[], slug: string): string[] {
  const bySlug = new Map(categories.filter((c) => c.slug).map((c) => [c.slug, c]));
  const path: string[] = [];
  let current = bySlug.get(slug);
  const seen = new Set<string>();
  while (current && !seen.has(current.slug)) {
    seen.add(current.slug);
    path.unshift(current.name);
    current = current.parentSlug ? bySlug.get(current.parentSlug) : undefined;
  }
  return path;
}

function toSearchOptions(categories: Category[], nodes: Category[]): DropdownOpt[] {
  return nodes.map((c) => {
    const path = pathLabels(categories, c.slug);
    const parents = path.slice(0, -1);
    return {
      name: c.name,
      value: c.slug,
      groupLabel: parents.length > 0 ? parents.join(" › ") : undefined,
    };
  });
}

// Two dependent dropdowns: picking a "Categoría" narrows the "Subcategoría"
// options to just its children. Both submit via hidden inputs into the
// same GET /search form as separate params (category, subcategory).
export default function CategorySubcategoryFilter({ categories, defaultCategory, defaultSubcategory }: Props) {
  const [categorySlug, setCategorySlug] = useState(defaultCategory);
  const [categoryChanged, setCategoryChanged] = useState(false);

  const namedCategories = useMemo(
    () => categories.filter((c) => c.slug),
    [categories]
  );

  const rootOptions = useMemo(
    () => [
      { name: "Todas las categorías", value: "" },
      ...namedCategories.filter((c) => !c.parentSlug).map((c) => ({ name: c.name, value: c.slug })),
    ],
    [namedCategories]
  );

  const categorySearchOptions = useMemo(
    () => [
      { name: "Todas las categorías", value: "" },
      ...toSearchOptions(namedCategories, namedCategories),
    ],
    [namedCategories]
  );

  const children = namedCategories.filter((c) => c.parentSlug === categorySlug);
  const nestedUnderSelected = useMemo(
    () => (categorySlug ? descendantsOf(namedCategories, categorySlug) : []),
    [categorySlug, namedCategories]
  );

  const subcategoryOptions = useMemo(
    () => [
      { name: "Todas las subcategorías", value: "" },
      ...children.map((c) => ({ name: c.name, value: c.slug })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categorySlug, namedCategories]
  );

  const subcategorySearchOptions = useMemo(
    () => [
      { name: "Todas las subcategorías", value: "" },
      ...toSearchOptions(namedCategories, nestedUnderSelected),
    ],
    [namedCategories, nestedUnderSelected]
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-foreground">Categoría</label>
        <CustomDropdown
          name="category"
          defaultValue={defaultCategory}
          options={rootOptions}
          searchOptions={categorySearchOptions}
          showSearch={true}
          onChange={(value) => {
            setCategorySlug(value);
            setCategoryChanged(true);
          }}
        />
      </div>

      {nestedUnderSelected.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-foreground">Subcategoría</label>
          <CustomDropdown
            key={categorySlug}
            name="subcategory"
            defaultValue={categoryChanged ? "" : defaultSubcategory}
            options={subcategoryOptions}
            searchOptions={subcategorySearchOptions}
            showSearch
          />
        </div>
      )}
    </>
  );
}
