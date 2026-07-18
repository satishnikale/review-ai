import type { CommentCategory, Severity } from "../lib/prisma";

export interface ReviewJobData {
  reviewId: string;
  prUrl: string;
  userId: string;
  prefs: {
    checkBugs: boolean;
    checkSec: boolean;
    checkPerf: boolean;
    checkStyle: boolean;
  };
}

export interface GeminiComment {
  file: string;
  line: number;
  category: CommentCategory;
  severity: Severity;
  comment: string;
  suggestion?: string;
}

export interface GitHubPRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface GitHubPRMetadata {
  number: number;
  title: string;
  body: string | null;
  head: { ref: string };
  base: { ref: string };
  user: { login: string };
  repoName: string;
}
