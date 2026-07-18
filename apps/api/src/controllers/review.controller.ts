import type { Request, Response } from "express";
import { createReviewSchema } from "@repo/validators";
import { ReviewStatus, prisma } from "../lib/prisma";
import {
  createReview,
  deleteReview,
  getReviewById,
  getUserReviews,
  getUserStats,
} from "../services/review.service";
import { AppError, ForbiddenError, NotFoundError } from "../utils/AppError";
import { logger } from "../lib/logger";

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, "Authenticated user is missing from request", "UNAUTHORIZED");
  }
  return req.userId;
}

export async function createReviewHandler(req: Request, res: Response): Promise<void> {
  const body = createReviewSchema.parse(req.body);
  const review = await createReview(requireUserId(req), body.prUrl);
  res.status(202).json(review);
}

export async function getReviewHandler(req: Request, res: Response): Promise<void> {
  const review = await getReviewById(req.params.id, requireUserId(req));
  res.json({ review });
}

export async function streamReviewHandler(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const reviewId = req.params.id;
  const initial = await prisma.review.findUnique({ where: { id: reviewId } });

  if (!initial) throw new NotFoundError("Review not found");
  if (initial.userId !== userId) throw new ForbiddenError("You do not have access to this review");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let closed = false;
  const send = (data: unknown): void => {
    if (!closed) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  const interval = setInterval(() => {
    void prisma.review
      .findUnique({
        where: { id: reviewId },
        include: { comments: { orderBy: [{ severity: "desc" }, { lineNumber: "asc" }] } },
      })
      .then((review) => {
        if (!review) {
          send({ status: ReviewStatus.FAILED, error: "Review not found" });
          clearInterval(interval);
          res.end();
          return;
        }

        send({ status: review.status, review });
        if (review.status === ReviewStatus.DONE || review.status === ReviewStatus.FAILED) {
          clearInterval(interval);
          res.end();
        }
      })
      .catch((err: unknown) => {
        send({ status: ReviewStatus.FAILED, error: "Stream failed" });
        clearInterval(interval);
        res.end();
        logger.error({ err, reviewId }, "Review stream failed");
      });
  }, 1500);

  req.on("close", () => {
    closed = true;
    clearInterval(interval);
  });
}

export async function listReviewsHandler(req: Request, res: Response): Promise<void> {
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 50);
  res.json(await getUserReviews(requireUserId(req), page, limit));
}

export async function deleteReviewHandler(req: Request, res: Response): Promise<void> {
  await deleteReview(req.params.id, requireUserId(req));
  res.status(204).send();
}

export async function statsHandler(req: Request, res: Response): Promise<void> {
  res.json({ stats: await getUserStats(requireUserId(req)) });
}
