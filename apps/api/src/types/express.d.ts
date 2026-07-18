import type { User } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: User;
    }
  }
}

export {};
