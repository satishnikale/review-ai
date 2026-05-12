import { z } from "zod";

export const prUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .includes("github.com", { message: "Must be a GitHub URL" })
  .regex(
    /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/,
    "Must be a valid GitHub PR URL (e.g. https://github.com/owner/repo/pull/123)"
  );

export const createReviewSchema = z.object({
  prUrl: prUrlSchema,
});

export const updatePreferencesSchema = z.object({
  checkBugs: z.boolean().optional(),
  checkSec: z.boolean().optional(),
  checkPerf: z.boolean().optional(),
  checkStyle: z.boolean().optional(),
  emailNotify: z.boolean().optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;