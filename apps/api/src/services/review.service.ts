import { subHours } from "date-fns";
import { ReviewStatus, Severity, prisma, type Review } from "../lib/prisma";
import { reviewQueue } from "../queues/review.queue";
import { ForbiddenError, NotFoundError } from "../utils/AppError";
import { parsePrUrl } from "../utils/parsePrUrl";

export async function createReview(userId: string, prUrl: string): Promise<Review> {
  const parsed = parsePrUrl(prUrl);
  const recent = await prisma.review.findFirst({
    where: {
      userId,
      prUrl,
      status: ReviewStatus.DONE,
      reviewedAt: { gte: subHours(new Date(), 1) },
    },
    orderBy: { reviewedAt: "desc" },
  });

  if (recent) {
    return recent;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { preferences: true },
  });
  const prefs = user.preferences ?? {
    checkBugs: true,
    checkSec: true,
    checkPerf: true,
    checkStyle: false,
  };

  const review = await prisma.review.create({
    data: {
      userId,
      prUrl,
      repoName: parsed.repoFullName,
      prNumber: parsed.pullNumber,
      status: ReviewStatus.PENDING,
    },
  });

  await reviewQueue.add(
    "process-review",
    {
      reviewId: review.id,
      userId,
      prUrl,
      prefs: {
        checkBugs: prefs.checkBugs,
        checkSec: prefs.checkSec,
        checkPerf: prefs.checkPerf,
        checkStyle: prefs.checkStyle,
      },
    },
    { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
  );

  return review;
}

export async function getReviewById(reviewId: string, userId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      comments: {
        orderBy: [{ severity: "desc" }, { lineNumber: "asc" }],
      },
    },
  });

  if (!review) throw new NotFoundError("Review not found");
  if (review.userId !== userId) throw new ForbiddenError("You do not have access to this review");
  return review;
}

export async function getUserReviews(userId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { _count: { select: { comments: true } } },
    }),
    prisma.review.count({ where: { userId } }),
  ]);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError("Review not found");
  if (review.userId !== userId) throw new ForbiddenError("You do not have access to this review");
  await prisma.review.delete({ where: { id: reviewId } });
}

export async function getUserStats(userId: string) {
  const [totalReviews, totalComments, severityGroups] = await Promise.all([
    prisma.review.count({ where: { userId, status: ReviewStatus.DONE } }),
    prisma.reviewComment.count({ where: { review: { userId } } }),
    prisma.reviewComment.groupBy({
      by: ["severity"],
      where: { review: { userId } },
      _count: { severity: true },
    }),
  ]);

  const severityCounts: Record<Severity, number> = {
    [Severity.LOW]: 0,
    [Severity.MEDIUM]: 0,
    [Severity.HIGH]: 0,
    [Severity.CRITICAL]: 0,
  };

  for (const group of severityGroups) {
    severityCounts[group.severity] = group._count.severity;
  }

  return { totalReviews, totalComments, severityCounts };
}
