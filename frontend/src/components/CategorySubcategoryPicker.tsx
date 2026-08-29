"use client";

import { useMemo, useState } from "react";
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
  autoOpenRoot?: boolean;
}

const LEVEL_LABELS = ["Categoría", "Subcategoría", "Sub-subcategoría"];
const levelLabel = (i: number) => LEVEL_LABELS[i] ?? `Nivel ${i + 1}`;

function buildPath(categories: CategoryOption[], id: string): string[] {
  const path: string[] = [];
  let current = categories.find((c) => c.id === id);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current.id);
    const parentId = current.parentId;
    current = parentId ? categories.find((c) => c.id === parentId) : undefined;
  }
  return path;
}

function ancestorNames(categories: CategoryOption[], id: string): string[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const names: string[] = [];
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    names.unshift(parent.name);
    current = parent;
  }
  return names;
}

function descendantsOf(categories: CategoryOption[], parentId: string | null): CategoryOption[] {
  const kids = (pid: string | null) =>
    categories.filter((c) => (c.parentId ?? null) === pid);
  const result: CategoryOption[] = [];
  const queue = parentId === null ? kids(null) : kids(parentId);
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    queue.push(...kids(node.id));
  }
  return result;
}

function toSearchOptions(categories: CategoryOption[], nodes: CategoryOption[]) {
  return nodes.map((c) => {
    const parents = ancestorNames(categories, c.id);
    return {
      name: c.name,
      value: c.id,
      groupLabel: parents.length > 0 ? parents.join(" › ") : undefined,
    };
  });
}

// Chains as many dropdowns deep as the category tree actually goes.
// Searching a level looks through that node AND every descendant
// (subcategoría and sub-subcategoría), then selecting a deep match
// fills the whole path so the lower dropdowns appear already set.
export default function CategorySubcategoryPicker({ categories, value, onChange, autoOpenRoot = false }: Props) {
  const [path, setPath] = useState<string[]>(() => buildPath(categories, value));

  const handleLevelChange = (level: number, newId: string) => {
    if (newId && categories.some((c) => c.id === newId)) {
      const full = buildPath(categories, newId);
      setPath(full);
      onChange(newId);
      return;
    }
    const newPath = path.slice(0, level);
    setPath(newPath);
    onChange(newPath[newPath.length - 1] || "");
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

  const searchByParent = useMemo(() => {
    const map = new Map<string | null, ReturnType<typeof toSearchOptions>>();
    map.set(null, toSearchOptions(categories, descendantsOf(categories, null)));
    return map;
  }, [categories]);

  return (
    <>
      {levels.map((level, i) => {
        const searchPool =
          i === 0
            ? searchByParent.get(null) ?? []
            : toSearchOptions(categories, descendantsOf(categories, level.parentId));
        return (
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
              searchOptions={searchPool}
              showSearch
              placeholder="Buscar categoría..."
              openOnMount={autoOpenRoot && i === 0}
              onChange={(val) => handleLevelChange(i, val)}
            />
          </div>
        );
      })}
    </>
  );
}
