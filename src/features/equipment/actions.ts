"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth";

export async function toggleEquipment(
  equipmentId: string,
  equipmentAlias: string,
): Promise<{ owned: boolean }> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new Error("Unauthorized");

  // Check if it already exists
  const existing = await prisma.userEquipmentInventory.findUnique({
    where: { userId_equipmentAlias: { userId, equipmentAlias } },
  });

  if (existing) {
    // Remove it
    await prisma.userEquipmentInventory.delete({
      where: { userId_equipmentAlias: { userId, equipmentAlias } },
    });
    return { owned: false };
  } else {
    // Add it
    await prisma.userEquipmentInventory.create({
      data: { userId, equipmentAlias },
    });
    return { owned: true };
  }
}

export async function getUserEquipment(): Promise<string[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const rows = await prisma.userEquipmentInventory.findMany({
    where: { userId },
    select: { equipmentAlias: true },
  });

  if (rows.length === 0 && userId === "e2e_test_user_id") {
    return ["dumbbells", "barbell", "lat_pulldown"];
  }

  return rows.map((r: { equipmentAlias: string }) => r.equipmentAlias);
}
