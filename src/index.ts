import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { connectDB } from "./config/db";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { requestLogger } from "./middlewares/requestLogger";
import logger from "./utils/logger";

import authRoutes from "./routes/auth.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import adminRoutes from "./routes/admin.routes";
import productRoutes from "./routes/product.route";

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
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
  message: {
    success: false,
    error: "Too many auth attempts, please try again later.",
  },
});

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health checks ─────────────────────────────────────────────────────────────
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

// ── Routes ────────────────────────────────────────────────────────────────────
const v1 = "/api/v1";
app.use(`${v1}/auth`, authLimiter, authRoutes);
app.use(`${v1}/cart`, cartRoutes);
app.use(`${v1}/orders`, orderRoutes);
app.use(`${v1}/payments`, paymentRoutes);
app.use(`${v1}/admin`, adminRoutes);
app.use(`${v1}/products`, productRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Boot ──────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, "E-Star API started");
  });
};

start().catch((err) => {
  logger.fatal({ err }, "Fatal startup error");
  process.exit(1);
});
