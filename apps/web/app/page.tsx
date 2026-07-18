"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  console.log("apiUrl is : ", apiUrl);
  const error = searchParams.get("error");
  const errorMessages: Record<string, string> = {
    oauth_failed: "GitHub login failed. Please try again.",
    oauth_denied: "You cancelled the GitHub login.",
    login_failed: "Login failed. Please try again.",
  };

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold">ReviewAI</h1>
          <p className="text-lg text-slate-300">AI-powered GitHub pull request reviews.</p>
        </div>
        {error ? <p className="rounded border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessages[error] ?? "Something went wrong. Please try again."}</p> : null}
        <ul className="space-y-2 text-left text-sm text-slate-300">
          <li>✓ Find bugs before merge</li>
          <li>✓ Catch security issues</li>
          <li>✓ Improve performance and style</li>
        </ul>
        <Link
          href={`${apiUrl}/api/auth/github`}
          className="inline-flex w-full items-center justify-center rounded bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          Continue with GitHub
        </Link>
      </section>
    </main>
  );
}
