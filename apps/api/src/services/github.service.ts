import axios, { AxiosError } from "axios";
import { Agent as HttpsAgent } from "https";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import type { GitHubPRFile, GitHubPRMetadata } from "../types/review";

const timeout = 10_000;

// Some local networks advertise IPv6 but cannot route it to GitHub. Pin these
// outbound OAuth/API calls to IPv4 so the callback does not time out first.
const githubHttpsAgent = new HttpsAgent({ family: 4, keepAlive: true });

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
});

const githubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  email: z.string().email().nullable(),
  avatar_url: z.string().url().nullable(),
});

const prMetadataSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  head: z.object({ ref: z.string() }),
  base: z.object({
    ref: z.string(),
    repo: z.object({ full_name: z.string() }),
  }),
  user: z.object({ login: z.string() }),
});

const prFileSchema = z.object({
  filename: z.string(),
  status: z.string(),
  additions: z.number(),
  deletions: z.number(),
  patch: z.string().optional(),
});

export interface GitHubUser {
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
}

function githubHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function mapGitHubError(err: unknown): AppError {
  if (err instanceof AxiosError) {
    if (err.code === "ECONNABORTED") {
      return new AppError(504, "GitHub API timed out", "GITHUB_TIMEOUT");
    }

    const status = err.response?.status;
    if (status === 401) return new AppError(401, "GitHub token is invalid or expired", "GITHUB_UNAUTHORIZED");
    if (status === 403) return new AppError(403, "GitHub token does not have access to this repo", "GITHUB_FORBIDDEN");
    if (status === 404) return new AppError(404, "PR not found. Make sure the URL is correct and you have repo access", "GITHUB_NOT_FOUND");
    if (status === 422) return new AppError(422, "Invalid PR URL parameters", "GITHUB_INVALID_PR");
    if (status) return new AppError(502, `GitHub API error: ${status}`, "GITHUB_API_ERROR");
  }

  return new AppError(502, "GitHub API error", "GITHUB_API_ERROR");
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_CALLBACK_URL,
      },
      { headers: { Accept: "application/json" }, httpsAgent: githubHttpsAgent, timeout },
    );

    return tokenResponseSchema.parse(response.data).access_token;
  } catch (err) {
    throw mapGitHubError(err);
  }
}

export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  try {
    const response = await axios.get("https://api.github.com/user", {
      headers: githubHeaders(accessToken),
      httpsAgent: githubHttpsAgent,
      timeout,
    });
    const user = githubUserSchema.parse(response.data);

    return {
      githubId: String(user.id),
      username: user.login,
      email: user.email,
      avatarUrl: user.avatar_url,
    };
  } catch (err) {
    throw mapGitHubError(err);
  }
}

export async function getPRMetadata(
  owner: string,
  repo: string,
  pullNumber: number,
  accessToken: string,
): Promise<GitHubPRMetadata> {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
      { headers: githubHeaders(accessToken), httpsAgent: githubHttpsAgent, timeout },
    );
    const metadata = prMetadataSchema.parse(response.data);

    return {
      number: metadata.number,
      title: metadata.title,
      body: metadata.body,
      head: metadata.head,
      base: { ref: metadata.base.ref },
      user: metadata.user,
      repoName: metadata.base.repo.full_name,
    };
  } catch (err) {
    throw mapGitHubError(err);
  }
}

export async function getPRFiles(
  owner: string,
  repo: string,
  pullNumber: number,
  accessToken: string,
): Promise<GitHubPRFile[]> {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`,
      {
        headers: githubHeaders(accessToken),
        httpsAgent: githubHttpsAgent,
        params: { per_page: 30 },
        timeout,
      },
    );

    return z.array(prFileSchema).parse(response.data).filter((file) => Boolean(file.patch));
  } catch (err) {
    throw mapGitHubError(err);
  }
}

export function buildDiffString(files: GitHubPRFile[]): string {
  return files.map((file) => `### File: ${file.filename}\n${file.patch ?? ""}`).join("\n\n");
}
