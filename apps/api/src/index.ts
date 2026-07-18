// Load .env before application modules are evaluated.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require("dotenv");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../../..", ".env") });

import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { connectRedis, disconnectRedis } from "./lib/redis";
import { errorHandler } from "./middleware/errorHandler";
import { globalLimiter } from "./middleware/rateLimiter";
import { authRouter } from "./routes/auth.routes";
import { healthRouter } from "./routes/health.routes";
import { reviewRouter } from "./routes/review.routes";
import { userRouter } from "./routes/user.routes";
import { startReviewWorker, stopReviewWorker } from "./workers/review.worker";

const app: Application = express();

async function bootstrap(): Promise<void> {
  await connectRedis();
  startReviewWorker();

  app.use(helmet());
  app.use(
    cors({
      origin: env.NEXT_PUBLIC_APP_URL,
      credentials: true,
    }),
  );
  app.use(globalLimiter);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use("/health", healthRouter);
  // OAuth URLs are public (and registered with GitHub) under /auth.
  // Keep this in sync with NEXT_PUBLIC_API_URL/auth/github and
  // GITHUB_CALLBACK_URL (/auth/github/callback).
  app.use("/api/auth", authRouter);
  app.use("/api/reviews", reviewRouter);
  app.use("/api/users", userRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found", code: "NOT_FOUND" });
  });
  app.use(errorHandler);

  const port = Number(env.PORT);
  const server = app.listen(port, () => {
    logger.info({ port, environment: env.NODE_ENV }, "API server started");
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info({ signal }, "Shutting down API server");
    server.close(async () => {
      await stopReviewWorker();
      await prisma.$disconnect();
      await disconnectRedis();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void bootstrap().catch((err: unknown) => {
  process.stderr.write(`Startup failed: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});

export default app;
