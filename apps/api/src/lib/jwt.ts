import jwt, { TokenExpiredError, type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { jwtPayloadSchema } from "@repo/validators";
import { env } from "../config/env";

export type AccessTokenPayload = z.infer<typeof jwtPayloadSchema>;

export class TokenError extends Error {
  constructor(
    message: string,
    public readonly code: "EXPIRED" | "INVALID",
  ) {
    super(message);
    this.name = "TokenError";
  }
}

export function signAccessToken(userId: string): string {
  const options: SignOptions = {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign({}, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (typeof payload === "string") {
    throw new jwt.JsonWebTokenError("Invalid token payload");
  }

  const normalized = {
    sub: payload.sub,
    iat: payload.iat,
    exp: payload.exp,
  };

  return jwtPayloadSchema.parse(normalized);
}

export function safeVerifyToken(token: string): AccessTokenPayload {
  try {
    return verifyAccessToken(token);
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new TokenError("Access token expired", "EXPIRED");
    }
    throw new TokenError("Invalid access token", "INVALID");
  }
}
