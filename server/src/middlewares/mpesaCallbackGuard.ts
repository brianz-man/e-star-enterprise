import { timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import logger from "../utils/logger";

/** Use Express's proxy-aware IP; never trust a raw X-Forwarded-For header here. */
const getClientIp = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || "";
};

/**
 * Optional hardening for the M-Pesa STK callback endpoint.
 * - MPESA_CALLBACK_SECRET: must match ?token= query param on the callback URL
 * - MPESA_CALLBACK_IPS: comma-separated allowlist (empty = allow all)
 */
export const mpesaCallbackGuard = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (
    env.isProd &&
    !env.mpesa.callbackToken &&
    env.mpesa.callbackIps.length === 0
  ) {
    logger.error(
      { path: req.path },
      "M-Pesa callback rejected: no production callback protection configured",
    );
    res.status(503).json({
      ResultCode: 1,
      ResultDesc: "Callback protection is not configured",
    });
    return;
  }

  if (env.mpesa.callbackToken) {
    const token = req.query.token;
    const supplied = typeof token === "string" ? Buffer.from(token) : null;
    const expected = Buffer.from(env.mpesa.callbackToken);
    const validToken =
      supplied !== null &&
      supplied.length === expected.length &&
      timingSafeEqual(supplied, expected);
    if (!validToken) {
      logger.warn(
        { ip: getClientIp(req), path: req.path },
        "M-Pesa callback rejected: invalid token",
      );
      res.status(403).json({ ResultCode: 1, ResultDesc: "Forbidden" });
      return;
    }
  }

  if (env.mpesa.callbackIps.length > 0) {
    const ip = getClientIp(req);
    if (!env.mpesa.callbackIps.includes(ip)) {
      logger.warn(
        { ip, allowed: env.mpesa.callbackIps },
        "M-Pesa callback rejected: IP not allowlisted",
      );
      res.status(403).json({ ResultCode: 1, ResultDesc: "Forbidden" });
      return;
    }
  }

  next();
};
