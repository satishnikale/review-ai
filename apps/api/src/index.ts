import { config } from "dotenv";
import { resolve } from "path";

// Load .env from repo root first
config({ path: resolve(__dirname, "../../../.env") });

import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { healthRouter } from "./routes/health";

const app: Application = express();

// ── Security middleware ──────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.NEXT_PUBLIC_APP_URL,
    credentials: true,
  }),
);

// ── Rate limiting ────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ── Body parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────
app.use("/health", healthRouter);

// ── Error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────
const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  logger.info(`API running at http://localhost:${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});

export default app;
