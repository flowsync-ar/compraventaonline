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

// Two dependent dropdowns: picking a "Categoría" narrows the "Subcategoría"
// options to just its children. Both submit via hidden inputs into the
// same GET /search form as separate params (category, subcategory).
export default function CategorySubcategoryFilter({ categories, defaultCategory, defaultSubcategory }: Props) {
  const [categorySlug, setCategorySlug] = useState(defaultCategory);
  const [categoryChanged, setCategoryChanged] = useState(false);

  const rootOptions = useMemo(
    () => categories.filter((c) => !c.parentSlug).map((c) => ({ name: c.name, value: c.slug })),
    [categories]
  );

  const children = categories.filter((c) => c.parentSlug === categorySlug);
  const subcategoryOptions = useMemo(
    () => [
      { name: "Todas las subcategorías", value: "" },
      ...children.map((c) => ({ name: c.name, value: c.slug })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categorySlug, categories]
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-foreground">Categoría</label>
        <CustomDropdown
          name="category"
          defaultValue={defaultCategory}
          options={rootOptions}
          showSearch={true}
          onChange={(value) => {
            setCategorySlug(value);
            setCategoryChanged(true);
          }}
        />
      </div>

      {children.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-foreground">Subcategoría</label>
          <CustomDropdown
            key={categorySlug}
            name="subcategory"
            defaultValue={categoryChanged ? "" : defaultSubcategory}
            options={subcategoryOptions}
          />
        </div>
      )}
    </>
  );
}
