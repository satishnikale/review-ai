"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { API_URL, getReview, type Review, type ReviewComment } from "../../../lib/api";

const severityClass: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-blue-100 text-blue-800",
};

const categoryClass: Record<string, string> = {
  BUG: "bg-red-100 text-red-800",
  SECURITY: "bg-orange-100 text-orange-800",
  PERFORMANCE: "bg-yellow-100 text-yellow-800",
  STYLE: "bg-blue-100 text-blue-800",
  SUGGESTION: "bg-purple-100 text-purple-800",
};

export default function ReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let source: EventSource | null = null;

    getReview(params.id)
      .then(({ review: initial }) => {
        setReview(initial);
        if (initial.status === "PENDING" || initial.status === "PROCESSING") {
          const token = localStorage.getItem("access_token");
          source = new EventSource(`${API_URL}/api/reviews/${params.id}/stream?token=${token ?? ""}`);
          source.onmessage = (event) => {
            const payload = JSON.parse(event.data) as { review?: Review; status: Review["status"] };
            if (payload.review) setReview(payload.review);
            if (payload.status === "DONE" || payload.status === "FAILED") source?.close();
          };
          source.onerror = () => source?.close();
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load review"));

    return () => source?.close();
  }, [params.id]);

  const commentsByFile = useMemo(() => {
    const groups = new Map<string, ReviewComment[]>();
    for (const comment of review?.comments ?? []) {
      groups.set(comment.filePath, [...(groups.get(comment.filePath) ?? []), comment]);
    }
    return Array.from(groups.entries());
  }, [review]);

  if (error) return <main className="p-8 text-red-600">{error}</main>;
  if (!review) return <main className="p-8 text-slate-500">Loading review...</main>;

  const comments = review.comments ?? [];
  const bugCount = comments.filter((comment) => comment.category === "BUG").length;
  const securityCount = comments.filter((comment) => comment.category === "SECURITY").length;

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="rounded border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">{review.prTitle ?? "Pull request review"}</h1>
              <p className="mt-1 text-sm text-slate-500">{review.repoName} · #{review.prNumber} · {new Date(review.createdAt).toLocaleString()}</p>
            </div>
            <span className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white">{review.status}</span>
          </div>
          {review.status === "PENDING" || review.status === "PROCESSING" ? (
            <div className="mt-6">
              <div className="h-2 overflow-hidden rounded bg-slate-200">
                <div className="h-full w-1/2 animate-pulse rounded bg-emerald-500" />
              </div>
              <p className="mt-2 text-sm text-slate-500">{review.status === "PENDING" ? "Queued" : "Reviewing"}...</p>
            </div>
          ) : null}
          {review.status === "FAILED" ? (
            <div className="mt-6 rounded border border-red-200 bg-red-50 p-4 text-red-700">
              Review failed. <button onClick={() => location.reload()} className="font-semibold underline">Retry</button>
            </div>
          ) : null}
        </div>

        {review.status === "DONE" ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Stat label="Total comments" value={comments.length} />
              <Stat label="Bugs" value={bugCount} />
              <Stat label="Security issues" value={securityCount} />
            </div>
            <div className="space-y-4">
              {commentsByFile.map(([file, fileComments]) => (
                <section key={file} className="rounded border bg-white">
                  <h2 className="border-b px-5 py-3 font-mono text-sm font-semibold text-slate-800">{file}</h2>
                  <div className="divide-y">
                    {fileComments.map((comment) => (
                      <article key={comment.id} className="space-y-3 p-5">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-mono text-slate-500">Line {comment.lineNumber}</span>
                          <span className={`rounded px-2 py-1 text-xs font-medium ${categoryClass[comment.category]}`}>{comment.category}</span>
                          <span className={`rounded px-2 py-1 text-xs font-medium ${severityClass[comment.severity]}`}>{comment.severity}</span>
                        </div>
                        <p className="text-slate-800">{comment.comment}</p>
                        {comment.suggestion ? <pre className="overflow-x-auto rounded bg-slate-950 p-4 text-sm text-slate-100">{comment.suggestion}</pre> : null}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
