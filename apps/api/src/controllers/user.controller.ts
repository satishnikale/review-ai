import type { Request, Response } from "express";
import { updatePreferencesSchema } from "@repo/validators";
import { prisma } from "../lib/prisma";
import { AppError, NotFoundError } from "../utils/AppError";

const refreshCookieName = "refresh_token";

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, "Authenticated user is missing from request", "UNAUTHORIZED");
  }
  return req.userId;
}

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: requireUserId(req) },
    select: {
      id: true,
      githubId: true,
      username: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
      preferences: true,
      _count: { select: { reviews: true } },
    },
  });

  if (!user) throw new NotFoundError("User not found");
  res.json({ user });
}

export async function updatePreferencesHandler(req: Request, res: Response): Promise<void> {
  const body = updatePreferencesSchema.parse(req.body);
  const preferences = await prisma.userPreference.upsert({
    where: { userId: requireUserId(req) },
    create: { userId: requireUserId(req), ...body },
    update: body,
  });

  res.json({ preferences });
}

export async function deleteAccountHandler(req: Request, res: Response): Promise<void> {
  await prisma.user.delete({ where: { id: requireUserId(req) } });
  res.clearCookie(refreshCookieName, { path: "/auth/refresh" });
  res.status(204).send();
}
