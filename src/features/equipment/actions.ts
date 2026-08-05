"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function toggleEquipment(
  equipmentId: string,
  equipmentAlias: string,
): Promise<{ owned: boolean }> {
  const { userId } = await auth();
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
  const { userId } = await auth();
  if (!userId) return [];

  const rows = await prisma.userEquipmentInventory.findMany({
    where: { userId },
    select: { equipmentAlias: true },
  });

  return rows.map((r: { equipmentAlias: string }) => r.equipmentAlias);
}
