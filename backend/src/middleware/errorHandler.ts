import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

/**
 * Global error handler — catches anything that slips through route handlers.
 * Keeps error details out of production responses.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({ err, stack: err.stack }, "Unhandled error");

  const status = (err as any).status ?? 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(status).json({ message });
}
