import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.isDev ? ["query", "warn", "error"] : ["error"],
  });

if (env.isDev) globalForPrisma.prisma = prisma;

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log(" PostgreSQL connected via Prisma");
  } catch (error) {
    console.error(" Database connection failed:", error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await prisma.$disconnect();
};
