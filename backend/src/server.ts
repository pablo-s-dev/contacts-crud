/// <reference path="./types/fastify.d.ts" />
import { createServer } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { initializeCache, closeCache } from "./utils/cache";

const app = createServer();

const start = async () => {
  try {
    // Initialize cache
    await initializeCache();

    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    logger.info({ port: env.PORT }, "Server running");
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await closeCache();
  await app.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await closeCache();
  await app.close();
  process.exit(0);
});

start();
