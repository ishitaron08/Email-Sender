import express from "express";
import cors from "cors";
import helmet from "helmet";
import passport from "passport";
import { env } from "./config/environment";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./config/logger";
import authRoutes from "./routes/auth.routes";
import emailRoutes from "./routes/email.routes";

export function createApp(): express.Application {
  const app = express();

  // ─── Global Middleware ──────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(passport.initialize());

  // ─── Request Logging ────────────────────────────────────
  app.use((req, res, next) => {
    logger.debug({ method: req.method, url: req.url, bodyKeys: Object.keys(req.body || {}) }, "Incoming request");

    // Log response status
    const originalSend = res.send.bind(res);
    res.send = function (body: any) {
      if (res.statusCode >= 400) {
        logger.warn({ method: req.method, url: req.url, status: res.statusCode, responseBody: typeof body === 'string' ? body.slice(0, 500) : undefined }, "Error response");
      }
      return originalSend(body);
    };
    next();
  });

  // ─── Health Check ───────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ─── Routes ─────────────────────────────────────────────
  app.use("/auth", authRoutes);
  app.use("/api/emails", emailRoutes);

  // ─── 404 Catch-All ──────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  // ─── Error Handler (must be last) ──────────────────────
  app.use(errorHandler);

  return app;
}
