import { z } from "zod";

export const loginSchema = z.object({
  code: z.string().min(1, "GitHub OAuth code is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const jwtPayloadSchema = z.object({
  sub: z.string(),
  iat: z.number(),
  exp: z.number(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;