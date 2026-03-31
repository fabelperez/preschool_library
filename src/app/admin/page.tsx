"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalBooks: number;
  totalResources: number;
  totalTeachers: number;
  pendingSubmissions: number;
  activeBookCheckouts: number;
  activeThemeCheckouts: number;
  totalShelves: number;
  totalCategories: number;
  recentCheckouts: {
    id: string;
    type: string;
    checkedOutAt: string;
    book: { title: string } | null;
    resourceCategory: { name: string } | null;
    teacher: { name: string };
  }[];
  recentSubmissions: {
    id: string;
    title: string;
    author: string;
    createdAt: string;
    teacher: { name: string };
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard…</div>;
  }

  if (!stats) {
    return <div className="text-center py-12 text-red-500">Failed to load dashboard</div>;
  }

  const statCards = [
    { label: "Total Books", value: stats.totalBooks, icon: "📖", color: "bg-blue-50 border-blue-200 text-blue-800" },
    { label: "Total Resources", value: stats.totalResources, icon: "📦", color: "bg-green-50 border-green-200 text-green-800" },
    { label: "Teachers", value: stats.totalTeachers, icon: "👩‍🏫", color: "bg-purple-50 border-purple-200 text-purple-800" },
    { label: "Shelves", value: stats.totalShelves, icon: "🗄️", color: "bg-amber-50 border-amber-200 text-amber-800" },
    { label: "Books Checked Out", value: stats.activeBookCheckouts, icon: "✅", color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
    { label: "Themes Checked Out", value: stats.activeThemeCheckouts, icon: "🎨", color: "bg-rose-50 border-rose-200 text-rose-800" },
  ];

  const quickActions = [
    { href: "/admin/submissions", label: "📋 Submissions", desc: `${stats.pendingSubmissions} pending`, highlight: stats.pendingSubmissions > 0 },
    { href: "/admin/shelves", label: "🗄️ Manage Shelves", desc: `${stats.totalShelves} shelves` },
    { href: "/admin/resources", label: "📦 Resources", desc: `${stats.totalResources} items` },
    { href: "/admin/shelves/layout", label: "📐 Room Layout", desc: "Drag & drop editor" },
    { href: "/admin/teachers", label: "👩‍🏫 Teachers", desc: `${stats.totalTeachers} registered` },
    { href: "/checked-out", label: "📊 Checked Out", desc: `${stats.activeBookCheckouts + stats.activeThemeCheckouts} active` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Library overview and quick actions</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`border rounded-xl p-4 ${card.color}`}>
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs mt-1 opacity-75">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`p-4 border rounded-xl hover:shadow-md transition-shadow ${
                action.highlight ? "bg-red-50 border-red-200 ring-2 ring-red-300" : "bg-white border-gray-200"
              }`}
            >
              <div className="font-semibold text-gray-800">{action.label}</div>
              <div className={`text-sm mt-1 ${action.highlight ? "text-red-600 font-medium" : "text-gray-500"}`}>
                {action.desc}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Two-column: Recent activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent checkouts */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800">Recent Checkouts</h2>
            <Link href="/checked-out" className="text-sm text-indigo-600 hover:underline">View all →</Link>
          </div>
          {stats.recentCheckouts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No active checkouts</p>
          ) : (
            <div className="space-y-3">
              {stats.recentCheckouts.map((co) => (
                <div key={co.id} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">{co.type === "THEME" ? "🎨" : "📖"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {co.type === "THEME" ? co.resourceCategory?.name : co.book?.title}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {co.teacher.name} · {new Date(co.checkedOutAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending submissions */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800">Pending Submissions</h2>
            <Link href="/admin/submissions" className="text-sm text-indigo-600 hover:underline">View all →</Link>
          </div>
          {stats.recentSubmissions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No pending submissions 🎉</p>
          ) : (
            <div className="space-y-3">
              {stats.recentSubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">📥</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{sub.title}</div>
                    <div className="text-gray-400 text-xs">
                      by {sub.author} · submitted by {sub.teacher.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
