import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncFn = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an async route handler and forwards any thrown errors
 * to Express's next(err) — eliminating try/catch boilerplate.
 */
export const asyncHandler =
  (fn: AsyncFn): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
