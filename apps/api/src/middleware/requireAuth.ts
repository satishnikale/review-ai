import type { NextFunction, Request, Response } from "express";
import { safeVerifyToken, TokenError } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { UnauthorizedError } from "../utils/AppError";

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header("authorization");
    const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;

    if (!header?.startsWith("Bearer ") && !queryToken) {
      throw new UnauthorizedError("Missing bearer token");
    }

    const token = queryToken ?? header?.slice("Bearer ".length);
    if (!token) {
      throw new UnauthorizedError("Missing bearer token");
    }
    const payload = safeVerifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      throw new UnauthorizedError("Authenticated user no longer exists");
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof TokenError) {
      next(new UnauthorizedError(err.message));
      return;
    }
    next(err);
  }
}
