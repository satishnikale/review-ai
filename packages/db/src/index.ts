import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "../generated/prisma";

config({ path: resolve(__dirname, "../../../.env") });
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export * from "../generated/prisma";
export type { PrismaClient } from "../generated/prisma";
