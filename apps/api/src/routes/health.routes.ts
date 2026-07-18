import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";

export const healthRouter: ExpressRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const checks = {
    database: "disconnected" as "connected" | "disconnected",
    redis: "disconnected" as "connected" | "disconnected",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "connected";
  } catch {
    checks.database = "disconnected";
  }

  try {
    await redis.ping();
    checks.redis = "connected";
  } catch {
    checks.redis = "disconnected";
  }

  const status = checks.database === "connected" && checks.redis === "connected" ? "ok" : "degraded";
  res.status(status === "ok" ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});
