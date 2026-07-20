import "dotenv/config";
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

const app = express();

// Trust the first hop in front of us (reverse proxy / load balancer — nginx,
// Render, Railway, Fly, an ALB, etc.). Without this, Express reads the
// proxy's own address as req.ip instead of the real client IP, which quietly
// breaks two things in production: express-rate-limit buckets every visitor
// under one shared IP (either over- or under-limiting everyone at once), and
// secure-cookie / X-Forwarded-Proto detection stops working correctly behind
// SSL-terminating proxies. `1` trusts exactly one hop; raise it if you sit
// behind more than one proxy layer.
if (env.isProd) app.set("trust proxy", 1);

// ── Security ──────────────────────────────────────────────────────────────────
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
    // 100 req/15min was shared across every route in the app (product
    // browsing, categories, cart reads/writes, image loads, etc.), so a
    // single normal browsing session — especially in dev with React
    // StrictMode double-invoking effects — exhausted it almost immediately
    // and produced 429s on routine actions like updating cart quantity.
    // This only guards against abusive traffic; day-to-day usage shouldn't
    // come close to it.
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

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(requestId);
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
  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, "E-Star API started");
  });

  // Graceful shutdown: containers/orchestrators (Docker, ECS, Kubernetes)
  // send SIGTERM before force-killing a process on redeploy or scale-down.
  // Without handling it, in-flight requests get dropped mid-response and the
  // Postgres connection is torn down uncleanly instead of released properly.
  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully");
    server.close(async () => {
      await disconnectDB();
      logger.info("Shutdown complete");
      process.exit(0);
    });
    // Don't hang forever if a connection refuses to close (e.g. a stuck
    // keep-alive socket) — force exit after a grace period.
    setTimeout(() => {
      logger.warn("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

// Without these, an error thrown outside Express's request lifecycle (e.g. in
// a stray unawaited promise, a timer callback, or a background job) either
// crashes the process with no application-level log line, or — worse, for
// unhandledRejection specifically — gets silently swallowed depending on the
// Node version, leaving the process running in an unknown state.
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
