import { Queue } from "bullmq";
import { bullRedis } from "../lib/redis";
import type { ReviewJobData } from "../types/review";

export const reviewQueue = new Queue<ReviewJobData, void, "process-review">("reviews", {
  connection: bullRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
