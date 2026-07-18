"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { prUrlSchema } from "@repo/validators";
import { createReview } from "../../../lib/api";

export default function NewReviewPage() {
  const router = useRouter();
  const [prUrl, setPrUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    const parsed = prUrlSchema.safeParse(prUrl);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid pull request URL");
      return;
    }

    setLoading(true);
    try {
      const review = await createReview(parsed.data);
      router.push(`/review/${review.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 rounded border bg-white p-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">New Review</h1>
          <p className="mt-1 text-sm text-slate-500">Paste a GitHub pull request URL.</p>
        </div>
        <input
          value={prUrl}
          onChange={(event) => setPrUrl(event.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
          className="w-full rounded border px-4 py-3 outline-none focus:border-emerald-500"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button disabled={loading} className="rounded bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-60">
          {loading ? "Creating..." : "Submit"}
        </button>
      </form>
    </main>
  );
}
