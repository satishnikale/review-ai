import { Router, type Router as ExpressRouter } from "express";
import { createReviewHandler, deleteReviewHandler, getReviewHandler, listReviewsHandler, statsHandler, streamReviewHandler } from "../controllers/review.controller";
import { requireAuth } from "../middleware/requireAuth";
import { reviewLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../utils/asyncHandler";

export const reviewRouter: ExpressRouter = Router();

reviewRouter.use(asyncHandler(requireAuth));
reviewRouter.get("/", asyncHandler(listReviewsHandler));
reviewRouter.get("/stats", asyncHandler(statsHandler));
reviewRouter.post("/", reviewLimiter, asyncHandler(createReviewHandler));
reviewRouter.get("/:id", asyncHandler(getReviewHandler));
reviewRouter.get("/:id/stream", asyncHandler(streamReviewHandler));
reviewRouter.delete("/:id", asyncHandler(deleteReviewHandler));
