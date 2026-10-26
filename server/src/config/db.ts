import { PrismaClient } from "@prisma/client";
import { env } from "./env";
import logger from "../utils/logger";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.prismaQueryLog ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (env.isDev) globalForPrisma.prisma = prisma;

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("PostgreSQL connected via Prisma");
  } catch (error) {
    logger.fatal({ err: error }, "Database connection failed");
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
};
