import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type Target = "body" | "query" | "params";

export const validate =
  (schema: ZodSchema, target: Target = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(
        target === "query"
          ? req.query
          : target === "params"
            ? req.params
            : req.body,
      );

      if (target === "body") {
        req.body = parsed;
      } else if (target === "params") {
        req[target] = parsed as any;
      } else {
        // req.query is read-only — merge keys individually
        Object.assign(req.query, parsed);
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        res
          .status(400)
          .json({ success: false, error: "Validation failed", errors });
        return;
      }
      next(err);
    }
  };
