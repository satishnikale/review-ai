import { Router, type Router as ExpressRouter } from "express";
import { githubCallback, githubLogin, logoutHandler, refresh } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { authLimiter } from "../middleware/rateLimiter";

export const authRouter: ExpressRouter = Router();

console.debug("authRouter initialized");

authRouter.get("/github", authLimiter, asyncHandler(githubLogin));
authRouter.get("/github/callback", asyncHandler(githubCallback));
authRouter.get("/refresh", asyncHandler(refresh));
authRouter.post("/logout", authLimiter, asyncHandler(logoutHandler));
