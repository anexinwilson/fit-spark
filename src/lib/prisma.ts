// Source: https://www.prisma.io/docs/orm/more/help-and-troubleshooting/nextjs-help

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { requireServerEnvironment } from "@/lib/server-env";

/**
 * Ensures only one PrismaClient instance is used during development (to avoid hot reload issues).
 * In production, always creates a new instance.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = requireServerEnvironment("DATABASE_URL");
  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

// Delay configuration access until a request actually uses the database. This
// keeps Next.js build-time page analysis independent of runtime secrets.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver);
  },
});
