import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import logger from "../utils/logger";

/**
 * Attaches a unique requestId to every request and logs
 * method, path, status code, and response time.
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestId = randomUUID();
  const start = Date.now();

  // Attach to req so controllers can include it in logs
  (req as Request & { requestId: string }).requestId = requestId;

  res.on("finish", () => {
    const ms = Date.now() - start;
    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level]({
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms,
      ip: req.ip,
    });
  });

  next();
};
