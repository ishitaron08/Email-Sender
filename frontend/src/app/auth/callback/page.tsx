"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * OAuth callback landing page.
 * The backend redirects here with ?token=<jwt>.
 * We store it in localStorage and redirect to the dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      router.replace("/login?error=" + error);
      return;
    }

    if (token) {
      localStorage.setItem("dispatch_token", token);
      router.replace("/compose");
    } else {
      router.replace("/login");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 animate-pulse">Signing you in…</p>
    </div>
  );
}
