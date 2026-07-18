import type { Request, Response } from "express";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { loginWithGitHub, logout, refreshAccessToken, type IssuedTokens } from "../services/auth.service";

const refreshCookieName = "refresh_token";
const refreshCookiePath = "/auth/refresh";

function setRefreshCookie(res: Response, tokens: IssuedTokens): void {
  res.cookie(refreshCookieName, tokens.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: refreshCookiePath,
  });
}

export async function githubLogin(_req: Request, res: Response): Promise<void> {
  console.debug("githubLogin called");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL);
  url.searchParams.set("scope", "repo,user:email");
  res.redirect(url.toString());
}

export async function githubCallback(req: Request, res: Response): Promise<void> {
  const oauthError = typeof req.query.error === "string" ? req.query.error : undefined;
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  if (oauthError || !code) {
    logger.warn({ oauthError }, "GitHub OAuth callback was denied or missing a code");
    res.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=${encodeURIComponent(oauthError ?? "oauth_failed")}`);
    return;
  }

  try {
    const { tokens } = await loginWithGitHub(code);
    setRefreshCookie(res, tokens);
    res.redirect(`${env.NEXT_PUBLIC_APP_URL}/auth/callback?token=${encodeURIComponent(tokens.accessToken)}`);
  } catch (err) {
    // Expired/used codes and token-exchange failures must return the user to
    // the app rather than exposing an API error page.
    logger.warn({ err }, "GitHub OAuth callback failed");
    res.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=login_failed`);
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  console.debug("refresh called");
  const refreshToken = req.cookies?.[refreshCookieName] as string | undefined;
  if (!refreshToken) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  const tokens = await refreshAccessToken(refreshToken);
  setRefreshCookie(res, tokens);
  res.json({ accessToken: tokens.accessToken });
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  console.debug("logoutHandler called");
  const refreshToken = req.cookies?.[refreshCookieName] as string | undefined;
  await logout(refreshToken);
  res.clearCookie(refreshCookieName, { path: refreshCookiePath });
  res.json({ success: true });
}
