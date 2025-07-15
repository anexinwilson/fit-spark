// Source: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-help

import { PrismaClient } from "@/generated/prisma";

/**
 * Ensures only one PrismaClient instance is used during development (to avoid hot reload issues).
 * In production, always creates a new instance.
 */
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
