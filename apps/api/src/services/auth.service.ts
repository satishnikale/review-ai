import { createId } from "@paralleldrive/cuid2";
import { addDays } from "date-fns";
import { signAccessToken } from "../lib/jwt";
import { prisma, type User } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { exchangeCodeForToken, getGitHubUser } from "./github.service";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export async function issueTokens(userId: string): Promise<IssuedTokens> {
  const refreshToken = createId();
  const refreshTokenExpiresAt = addDays(new Date(), 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: refreshTokenExpiresAt,
    },
  });

  return {
    accessToken: signAccessToken(userId),
    refreshToken,
    refreshTokenExpiresAt,
  };
}

export async function loginWithGitHub(
  code: string,
): Promise<{ user: User; tokens: IssuedTokens; isNewUser: boolean }> {
  const accessToken = await exchangeCodeForToken(code);
  const githubUser = await getGitHubUser(accessToken);
  const existingUser = await prisma.user.findUnique({
    where: { githubId: githubUser.githubId },
  });

  const user = await prisma.user.upsert({
    where: { githubId: githubUser.githubId },
    update: {
      username: githubUser.username,
      email: githubUser.email,
      avatarUrl: githubUser.avatarUrl,
      accessToken,
    },
    create: {
      githubId: githubUser.githubId,
      username: githubUser.username,
      email: githubUser.email,
      avatarUrl: githubUser.avatarUrl,
      accessToken,
      preferences: { create: {} },
    },
  });

  return { user, tokens: await issueTokens(user.id), isNewUser: !existingUser };
}

export async function refreshAccessToken(refreshToken: string): Promise<IssuedTokens> {
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!stored) {
    throw new AppError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  if (stored.expiresAt <= new Date()) {
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    throw new AppError(401, "Refresh token expired, please login again", "REFRESH_TOKEN_EXPIRED");
  }

  await prisma.refreshToken.delete({ where: { token: refreshToken } });
  return issueTokens(stored.userId);
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) {
    return;
  }

  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}
