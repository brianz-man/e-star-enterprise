import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";
import logger from "../utils/logger";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = (req as Request & { requestId?: string }).requestId;

  // Known operational error — log at warn level
  if (err instanceof ApiError) {
    logger.warn(
      { requestId, statusCode: err.statusCode, code: err.code },
      err.message,
    );
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Prisma unique constraint
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const field = (err.meta?.target as string[])?.join(", ") || "field";
      res.status(409).json({
        success: false,
        error: `A record with this ${field} already exists`,
        code: "CONFLICT",
      });
      return;
    }
    if (err.code === "P2025") {
      res
        .status(404)
        .json({ success: false, error: "Record not found", code: "NOT_FOUND" });
      return;
    }
  }

  // Unknown / unexpected error — log at error level with full context
  logger.error({ requestId, err }, "Unhandled error");

  res.status(500).json({
    success: false,
    error: env.isDev ? err.message : "Internal server error",
    code: "INTERNAL_ERROR",
    ...(env.isDev && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: "ROUTE_NOT_FOUND",
  });
};
