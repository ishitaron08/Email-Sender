"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useRateLimit } from "@/hooks/useEmails";
import { ReactNode } from "react";

const navItems = [
  { href: "/compose", label: "Compose", icon: "✏️" },
  { href: "/scheduled", label: "Scheduled", icon: "🕐" },
  { href: "/sent", label: "Sent", icon: "✅" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useSession();
  const { data: rateLimit } = useRateLimit();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-800">Dispatch Engine</h1>
          <p className="text-xs text-gray-400 mt-1">Email Scheduler</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Rate limit indicator */}
        {rateLimit && (
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Hourly Send Budget</p>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (rateLimit.remaining / rateLimit.limit) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {rateLimit.remaining} / {rateLimit.limit} remaining
            </p>
          </div>
        )}

        {/* User info */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm truncate">
            <p className="font-medium text-gray-700 truncate">
              {user?.displayName ?? "Guest"}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-xs text-red-500 hover:underline whitespace-nowrap ml-2"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
