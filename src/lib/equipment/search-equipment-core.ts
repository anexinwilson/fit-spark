import type {
  EquipmentItem,
  EquipmentSearchQuery,
  EquipmentSearchResponse,
} from "@/lib/equipment/types";

export type EquipmentRow = {
  slug: string;
  sourceValue: string;
  displayName: string;
  category: string;
  level: string;
  aliases: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  imageUrls: string[];
};

export function searchEquipmentRows(
  rows: EquipmentRow[],
  query: EquipmentSearchQuery = {},
): EquipmentSearchResponse {
  const { q = "", muscle, level, category, limit = 100 } = query;
  const searchTerm = q.trim().toLowerCase();
  const effectiveLimit = Math.max(0, limit);

  const filtered = rows.filter((item) => {
    const searchable = [
      item.displayName,
      item.sourceValue,
      item.category,
      ...item.aliases,
      ...item.primaryMuscles,
      ...item.secondaryMuscles,
    ].map((value) => value.toLowerCase());

    const matchesQuery =
      !searchTerm || searchable.some((value) => value.includes(searchTerm));
    const matchesMuscle =
      !muscle ||
      muscle === "all" ||
      [...item.primaryMuscles, ...item.secondaryMuscles].some((value) =>
        value.toLowerCase().includes(muscle.toLowerCase()),
      );
    const matchesLevel =
      !level ||
      level === "all" ||
      item.level.toLowerCase() === level.toLowerCase();
    const matchesCategory =
      !category ||
      category === "all" ||
      item.category.toLowerCase() === category.toLowerCase();

    return matchesQuery && matchesMuscle && matchesLevel && matchesCategory;
  });

  const results: EquipmentItem[] = filtered
    .slice(0, effectiveLimit)
    .map((item) => ({
      id: item.slug,
      name: item.displayName,
      category: item.category,
      level: item.level,
      equipment_type: item.sourceValue,
      equipment_name: item.displayName,
      equipment_aliases: item.aliases,
      primary_muscles: item.primaryMuscles,
      secondary_muscles: item.secondaryMuscles,
      image_urls: item.imageUrls,
      instructions: [],
    }));

  return { success: true, results, source: "catalog", count: results.length };
}
