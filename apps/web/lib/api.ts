const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ReviewStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Category = "BUG" | "SECURITY" | "PERFORMANCE" | "STYLE" | "SUGGESTION";

export interface UserPreference {
  userId: string;
  checkBugs: boolean;
  checkSec: boolean;
  checkPerf: boolean;
  checkStyle: boolean;
  emailNotify: boolean;
}

export interface User {
  id: string;
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  preferences: UserPreference | null;
  _count: { reviews: number };
}

export interface ReviewComment {
  id: string;
  reviewId: string;
  filePath: string;
  lineNumber: number;
  category: Category;
  severity: Severity;
  comment: string;
  suggestion: string | null;
}

export interface Review {
  id: string;
  prUrl: string;
  repoName: string;
  prTitle: string | null;
  prNumber: number;
  status: ReviewStatus;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: ReviewComment[];
  _count?: { comments: number };
}

export interface Stats {
  totalReviews: number;
  totalComments: number;
  severityCounts: Record<Severity, number>;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    window.location.href = "/";
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getMe() {
  return apiFetch<{ user: User }>("/api/users/me");
}

export function getReviews(page = 1) {
  return apiFetch<{ reviews: Review[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
    `/api/reviews?page=${page}`,
  );
}

export function createReview(prUrl: string) {
  return apiFetch<Review>("/api/reviews", {
    method: "POST",
    body: JSON.stringify({ prUrl }),
  });
}

export function getReview(id: string) {
  return apiFetch<{ review: Review }>(`/api/reviews/${id}`);
}

export function deleteReview(id: string) {
  return apiFetch<void>(`/api/reviews/${id}`, { method: "DELETE" });
}

export function getStats() {
  return apiFetch<{ stats: Stats }>("/api/reviews/stats");
}

export function updatePreferences(data: Partial<Omit<UserPreference, "userId">>) {
  return apiFetch<{ preferences: UserPreference }>("/api/users/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAccount() {
  return apiFetch<void>("/api/users/me", { method: "DELETE" });
}

// Keep OAuth and future UI calls on a single typed client while retaining the
// named exports used by the existing pages.
export const api = {
  getMe: async (): Promise<User> => (await getMe()).user,
  getReviews,
  createReview,
  getReview: async (id: string): Promise<Review> => (await getReview(id)).review,
  deleteReview,
  getStats: async (): Promise<Stats> => (await getStats()).stats,
  updatePreferences: async (data: Partial<Omit<UserPreference, "userId">>): Promise<UserPreference> =>
    (await updatePreferences(data)).preferences,
  deleteAccount,
};

export { API_URL };
