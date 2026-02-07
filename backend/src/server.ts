/**
 * API Server Entry Point
 *
 * Starts the Express HTTP server and runs a recovery sweep
 * for any dispatches that were orphaned by a previous crash.
 */
import { createApp } from "./app";
import { env } from "./config/environment";
import { logger } from "./config/logger";
import { recoverStaleDispatches } from "./services/scheduler.service";

async function boot(): Promise<void> {
  const app = createApp();

  // Recover any dispatches that didn't make it into the queue
  const recovered = await recoverStaleDispatches();
  if (recovered > 0) {
    logger.info({ recovered }, "Startup recovery complete");
  }

  app.listen(env.API_PORT, () => {
    logger.info(
      { port: env.API_PORT, env: env.NODE_ENV },
      `🚀 Dispatch Engine API listening on port ${env.API_PORT}`
    );
  });
}

boot().catch((err) => {
  logger.fatal({ err }, "Failed to start API server");
  process.exit(1);
});
