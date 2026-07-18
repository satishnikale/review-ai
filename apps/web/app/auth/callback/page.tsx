"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "../../../lib/store";
import { api } from "../../../lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    let active = true;

    const handleCallback = async (): Promise<void> => {
      const token = searchParams.get("token");
      const error = searchParams.get("error");
      if (error || !token) {
        router.replace(`/?error=${encodeURIComponent(error ?? "oauth_failed")}`);
        return;
      }

      try {
        // Store before fetching so the API client can authenticate the request.
        localStorage.setItem("access_token", token);
        const user = await api.getMe();
        if (!active) return;
        setAuth(token, user);
        router.replace("/dashboard");
      } catch (err) {
        console.error("OAuth callback failed", err);
        localStorage.removeItem("access_token");
        if (active) router.replace("/?error=login_failed");
      }
    };

    void handleCallback();
    return () => {
      active = false;
    };
  }, [router, searchParams, setAuth]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400" />
        <p className="font-medium">Logging you in...</p>
        <p className="text-sm text-slate-400">Connecting your GitHub account</p>
      </div>
    </main>
  );
}
