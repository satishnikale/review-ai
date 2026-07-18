import { Job, Worker } from "bullmq";
import { logger } from "../lib/logger";
import { bullRedis } from "../lib/redis";
import { ReviewStatus, prisma } from "../lib/prisma";
import type { ReviewJobData } from "../types/review";
import { parsePrUrl } from "../utils/parsePrUrl";
import { buildDiffString, getPRFiles, getPRMetadata } from "../services/github.service";
import { reviewDiffWithGemini } from "../services/gemini.service";
import { AppError } from "../utils/AppError";

let worker: Worker<ReviewJobData, void, "process-review"> | null = null;

async function markFailed(reviewId: string): Promise<void> {
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: ReviewStatus.FAILED },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Review pipeline timed out")), ms);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
}

async function processReview(job: Job<ReviewJobData, void, "process-review">): Promise<void> {
  const { reviewId, userId, prUrl, prefs } = job.data;
  logger.info({ reviewId, attempt: job.attemptsMade + 1 }, "Processing review job");

  try {
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: ReviewStatus.PROCESSING },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.accessToken) {
      await markFailed(reviewId);
      logger.warn({ reviewId, userId }, "Review failed permanently: missing GitHub access token");
      return;
    }

    const parsed = parsePrUrl(prUrl);
    const [metadata, files] = await withTimeout(
      Promise.all([
        getPRMetadata(parsed.owner, parsed.repo, parsed.pullNumber, user.accessToken),
        getPRFiles(parsed.owner, parsed.repo, parsed.pullNumber, user.accessToken),
      ]),
      15_000,
    );

    if (files.length === 0) {
      await prisma.review.update({
        where: { id: reviewId },
        data: {
          repoName: metadata.repoName,
          prTitle: metadata.title,
          prNumber: metadata.number,
          status: ReviewStatus.DONE,
          reviewedAt: new Date(),
        },
      });
      logger.info({ reviewId }, "Review completed with no diff patches");
      return;
    }

    const comments = await reviewDiffWithGemini(buildDiffString(files), prefs);

    await prisma.$transaction([
      prisma.reviewComment.createMany({
        data: comments.map((comment) => ({
          reviewId,
          filePath: comment.file,
          lineNumber: comment.line,
          category: comment.category,
          severity: comment.severity,
          comment: comment.comment,
          suggestion: comment.suggestion,
        })),
      }),
      prisma.review.update({
        where: { id: reviewId },
        data: {
          repoName: metadata.repoName,
          prTitle: metadata.title,
          prNumber: metadata.number,
          status: ReviewStatus.DONE,
          reviewedAt: new Date(),
        },
      }),
    ]);

    logger.info({ reviewId, commentCount: comments.length }, "Review job completed");
  } catch (err) {
    if (err instanceof AppError && err.statusCode < 500) {
      await markFailed(reviewId);
      logger.warn({ err, reviewId }, "Review failed permanently");
      return;
    }

    logger.error({ err, reviewId }, "Review job failed with retryable error");
    throw err;
  }
}

export function startReviewWorker(): Worker<ReviewJobData, void, "process-review"> {
  if (worker) return worker;

  worker = new Worker<ReviewJobData, void, "process-review">("reviews", processReview, {
    connection: bullRedis,
    concurrency: 3,
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, reviewId: job.data.reviewId }, "Review job completed");
  });

  worker.on("failed", (job: Job<ReviewJobData, void, "process-review"> | undefined, err: Error) => {
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? 3;
    logger.error({ err, reviewId: job?.data.reviewId, attemptsMade }, "Review job failed");

    if (job && attemptsMade >= maxAttempts) {
      void markFailed(job.data.reviewId).catch((updateErr: unknown) => {
        logger.error({ err: updateErr, reviewId: job.data.reviewId }, "Failed to mark review failed");
      });
    }
  });

  return worker;
}

export async function stopReviewWorker(): Promise<void> {
  if (!worker) return;
  await worker.close();
  worker = null;
}
