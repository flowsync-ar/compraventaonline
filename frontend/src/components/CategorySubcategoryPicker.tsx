"use client";

import { useState } from "react";
import CustomDropdown from "./CustomDropdown";

interface CategoryOption {
  id: string;
  name: string;
  parentId?: string | null;
}

interface Props {
  categories: CategoryOption[];
  value: string;
  onChange: (categoryId: string) => void;
}

const LEVEL_LABELS = ["Categoría", "Subcategoría", "Sub-subcategoría"];
const levelLabel = (i: number) => LEVEL_LABELS[i] ?? `Nivel ${i + 1}`;

function buildPath(categories: CategoryOption[], id: string): string[] {
  const path: string[] = [];
  let current = categories.find((c) => c.id === id);
  while (current) {
    path.unshift(current.id);
    const parentId = current.parentId;
    current = parentId ? categories.find((c) => c.id === parentId) : undefined;
  }
  return path;
}

// Chains as many dropdowns deep as the category tree actually goes —
// Computación -> Periféricos -> Teclados y Mouse -> Mouse, or just
// "Ayuda" alone if a root has no children at all. Each level's options
// are the children of whatever was picked one level up; a level only
// appears once its parent level has an actual selection, and stops
// entirely once a level has no children to offer.
export default function CategorySubcategoryPicker({ categories, value, onChange }: Props) {
  const [path, setPath] = useState<string[]>(() => buildPath(categories, value));

  const handleLevelChange = (level: number, newId: string) => {
    const newPath = path.slice(0, level);
    if (newId) newPath.push(newId);
    setPath(newPath);
    onChange(newId || newPath[newPath.length - 1] || "");
  };

  const levels: { parentId: string | null; options: CategoryOption[] }[] = [];
  let currentParentId: string | null = null;
  for (let i = 0; ; i++) {
    const options = categories.filter((c) => (c.parentId ?? null) === currentParentId);
    if (options.length === 0) break;
    levels.push({ parentId: currentParentId, options });
    const selectedAtLevel = path[i];
    if (!selectedAtLevel) break;
    currentParentId = selectedAtLevel;
  }

  return (
    <>
      {levels.map((level, i) => (
        <div key={level.parentId ?? "root"} className="flex flex-col gap-2">
          <label className="text-xs font-bold text-foreground">{levelLabel(i)}</label>
          <CustomDropdown
            key={level.parentId ?? "root"}
            name={`category-level-${i}`}
            defaultValue={path[i] ?? ""}
            options={[
              { name: i === 0 ? "Seleccioná una categoría" : "Sin subcategoría específica", value: "" },
              ...level.options.map((c) => ({ name: c.name, value: c.id })),
            ]}
            showSearch
            placeholder="Buscar categoría..."
            onChange={(val) => handleLevelChange(i, val)}
          />
        </div>
      ))}
    </>
  );
}
