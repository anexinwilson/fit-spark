import { prisma } from "@/lib/prisma";
import type { EquipmentSearchQuery, EquipmentSearchResponse } from "./types";
import { searchEquipmentRows } from "./search-equipment-core";

export async function searchEquipment(
  query: EquipmentSearchQuery = {},
): Promise<EquipmentSearchResponse> {
  const rows = await prisma.equipment.findMany({
    orderBy: { displayName: "asc" },
  });
  return searchEquipmentRows(rows, query);
}

export { searchEquipmentRows } from "./search-equipment-core";
export type { EquipmentRow } from "./search-equipment-core";
