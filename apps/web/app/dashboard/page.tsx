"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getReviews, getStats, type Review, type Stats } from "../../lib/api";
import { useAuthStore } from "../../lib/store";

export default function DashboardPage() {
  const router = useRouter();
  const { token, user, hydrate, clearAuth } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void hydrate().catch(() => router.replace("/"));
  }, [hydrate, router]);

  useEffect(() => {
    const currentToken = localStorage.getItem("access_token") ?? token;
    if (!currentToken) {
      router.replace("/");
      return;
    }

    Promise.all([getReviews(), getStats()])
      .then(([reviewResponse, statsResponse]) => {
        setReviews(reviewResponse.reviews);
        setStats(statsResponse.stats);
      })
      .finally(() => setLoading(false));
  }, [router, token]);

  const logout = (): void => {
    clearAuth();
    router.replace("/");
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <nav className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-slate-950">ReviewAI</Link>
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full" /> : null}
            <span className="text-sm font-medium text-slate-700">{user?.username ?? "Loading"}</span>
            <button onClick={logout} className="rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Logout</button>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-slate-950">Dashboard</h1>
          <Link href="/review/new" className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500">New Review</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Total reviews" value={stats?.totalReviews ?? 0} />
          <Stat label="Total comments" value={stats?.totalComments ?? 0} />
          <Stat label="Bugs found" value={(stats?.severityCounts.HIGH ?? 0) + (stats?.severityCounts.CRITICAL ?? 0)} />
        </div>

        <div className="overflow-hidden rounded border bg-white">
          {loading ? (
            <div className="p-6 text-slate-500">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="p-6 text-slate-500">No reviews yet.</div>
          ) : (
            reviews.map((review) => (
              <Link key={review.id} href={`/review/${review.id}`} className="block border-b p-5 last:border-b-0 hover:bg-slate-50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-slate-950">{review.prTitle ?? review.prUrl}</h2>
                    <p className="text-sm text-slate-500">{review.repoName} · {new Date(review.createdAt).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={review.status} />
                </div>
              </Link>
            ))
          )}
        </div>
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

function StatusBadge({ status }: { status: Review["status"] }) {
  return <span className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white">{status}</span>;
}
