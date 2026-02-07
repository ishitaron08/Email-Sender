import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { logger } from "../config/logger";

/**
 * Creates Express middleware that validates `req.body` against a Zod schema.
 * On failure, returns a structured 422 response listing every violation.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse in-place — also strips unknown keys
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const validationErrors = err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        logger.warn({ url: req.url, validationErrors, body: req.body }, "Validation failed");
        res.status(422).json({
          message: "Validation failed",
          errors: validationErrors,
        });
        return;
      }
      next(err);
    }
  };
}
