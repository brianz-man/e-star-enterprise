/**
 * Structured logger using pino.
 * Provides request IDs, log levels, and JSON output suitable for
 * Railway / Render log drains and tools like BetterStack or Datadog.
 *
 * Usage:
 *   import logger from "../utils/logger";
 *   logger.info({ orderId }, "Payment initiated");
 *   logger.error({ err }, "STK push failed");
 */
import pino from "pino";
import { env } from "../config/env";

const logger = pino({
  level: env.isDev ? "debug" : "info",
  ...(env.isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  }),
});

export default logger;
