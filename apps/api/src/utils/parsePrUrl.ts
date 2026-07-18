import { AppError } from "./AppError";

export interface ParsedPrUrl {
  owner: string;
  repo: string;
  pullNumber: number;
  repoFullName: string;
}

export function parsePrUrl(prUrl: string): ParsedPrUrl {
  let parsed: URL;
  try {
    parsed = new URL(prUrl);
  } catch {
    throw new AppError(400, "Invalid GitHub pull request URL", "INVALID_PR_URL");
  }

  if (parsed.hostname !== "github.com") {
    throw new AppError(400, "Pull request URL must be from github.com", "INVALID_PR_URL");
  }

  const [owner, repo, segment, pullNumberRaw] = parsed.pathname.split("/").filter(Boolean);
  const pullNumber = Number(pullNumberRaw);

  if (!owner || !repo || segment !== "pull" || !Number.isInteger(pullNumber) || pullNumber < 1) {
    throw new AppError(400, "Invalid GitHub pull request URL", "INVALID_PR_URL");
  }

  return { owner, repo, pullNumber, repoFullName: `${owner}/${repo}` };
}
