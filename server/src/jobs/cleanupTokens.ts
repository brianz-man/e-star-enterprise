import { prisma } from "../config/db";
import logger from "../utils/logger";

const HOUR_MS = 60 * 60 * 1000;

export const startTokenCleanup = (): (() => void) => {
  let isRunning = false;

  const cleanup = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      const now = new Date();
      const [refreshTokens, verificationTokens, passwordResetTokens] =
        await prisma.$transaction([
          prisma.refreshToken.deleteMany({
            where: { expiresAt: { lte: now } },
          }),
          prisma.verificationToken.deleteMany({
            where: { expiresAt: { lte: now } },
          }),
          prisma.passwordResetToken.deleteMany({
            where: { expiresAt: { lte: now } },
          }),
        ]);

      const deleted =
        refreshTokens.count +
        verificationTokens.count +
        passwordResetTokens.count;
      if (deleted > 0) logger.info({ deleted }, "Expired tokens purged");
    } catch (error) {
      logger.error({ err: error }, "Token cleanup failed");
    } finally {
      isRunning = false;
    }
  };

  void cleanup();
  const interval = setInterval(() => void cleanup(), HOUR_MS);
  interval.unref();

  return () => clearInterval(interval);
};
