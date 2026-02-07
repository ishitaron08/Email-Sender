import { PrismaClient } from "@prisma/client";
import { logger } from "../config/logger";

/**
 * Singleton Prisma client.
 * In development we attach it to `globalThis` to avoid creating
 * multiple clients during hot-reload.
 */
const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
    ],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

// Pipe Prisma logs into our structured logger
prisma.$on("error" as never, (e: any) => {
  logger.error({ prismaError: e }, "Prisma error");
});
