import pino from "pino";
import { env } from "./environment";

/**
 * Structured JSON logger via Pino.
 * In development we pipe through pino-pretty for readability.
 */
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  base: { service: "dispatch-engine" },
});
