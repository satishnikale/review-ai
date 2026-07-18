import { Router, type Router as ExpressRouter } from "express";
import { deleteAccountHandler, getMeHandler, updatePreferencesHandler } from "../controllers/user.controller";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../utils/asyncHandler";

export const userRouter: ExpressRouter = Router();

userRouter.use(asyncHandler(requireAuth));
userRouter.get("/me", asyncHandler(getMeHandler));
userRouter.patch("/me/preferences", asyncHandler(updatePreferencesHandler));
userRouter.delete("/me", asyncHandler(deleteAccountHandler));
