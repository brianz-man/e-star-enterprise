import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import { requestId } from "./middlewares/requestId";
import logger from "./utils/logger";

import authRoutes from "./routes/auth.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import adminRoutes from "./routes/admin.routes";
import productRoutes from "./routes/product.route";
import { startTokenCleanup } from "./jobs/cleanupTokens";

const app = express();

if (env.isProd) app.set("trust proxy", 1);

//  Security
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,

    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Too many requests, please try again later.",
    },
  }),
);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many auth attempts, please try again later.",
  },
});

//  Logging
app.use(requestId);
app.use(requestLogger);

//  Body parsing
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());

//  Health checks
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "E-Star API",
    version: "1",
    timestamp: new Date().toISOString(),
  });
});

// Readiness: checks DB connectivity
app.get("/ready", async (_req, res) => {
  try {
    const { prisma } = await import("./config/db");
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not ready" });
  }
});

//  Routes
const v1 = "/api/v1";
app.use(`${v1}/auth`, authLimiter, authRoutes);
app.use(`${v1}/cart`, cartRoutes);
app.use(`${v1}/orders`, orderRoutes);
app.use(`${v1}/payments`, paymentRoutes);
app.use(`${v1}/admin`, adminRoutes);
app.use(`${v1}/products`, productRoutes);

// Serve React build in single-container production deploys
if (env.serveClient) {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

//  Error handling
app.use(notFoundHandler);
app.use(errorHandler);

//  Boot
const start = async () => {
  await connectDB();
  const stopTokenCleanup = startTokenCleanup();
  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, "E-Star API started");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully");
    stopTokenCleanup();
    server.close(async () => {
      await disconnectDB();
      logger.info("Shutdown complete");
      process.exit(0);
    });

    setTimeout(() => {
      logger.warn("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — exiting");
  process.exit(1);
});

start().catch((err) => {
  logger.fatal({ err }, "Fatal startup error");
  process.exit(1);
});
