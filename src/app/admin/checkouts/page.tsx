"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";

interface CheckoutRecord {
  id: string;
  type: "book" | "theme" | "resource";
  itemName: string;
  itemDetail: string;
  teacherId: string;
  teacherName: string;
  checkedOutAt: string;
  dueDate: string;
  availability: { available: number; total: number } | null;
}

type TypeFilter = "all" | "book" | "theme" | "resource";
type DueFilter = "all" | "due-soon" | "overdue";
type DueStatus = "normal" | "due-soon" | "overdue";

function getDueStatus(dueDate: string): DueStatus {
  const now = new Date();
  const due = new Date(dueDate);
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 3) return "due-soon";
  return "normal";
}

const DUE_BADGE: Record<DueStatus, string> = {
  normal: "",
  "due-soon": "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};

const TYPE_ICON: Record<string, string> = {
  book: "📖",
  theme: "🎨",
  resource: "📦",
};

export default function AdminCheckoutsPage() {
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchCheckouts = () => {
    setLoading(true);
    fetch("/api/active-checkouts")
      .then((r) => r.json())
      .then(setCheckouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCheckouts();
  }, []);

  const handleForceReturn = async (co: CheckoutRecord) => {
    setReturning(co.id);
    setMessage(null);

    const endpoint =
      co.type === "resource"
        ? "/api/resource-checkouts/return"
        : "/api/checkouts/return";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: co.id }),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: `${TYPE_ICON[co.type]} "${co.itemName}" force-returned from ${co.teacherName}`,
        });
        fetchCheckouts();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Return failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setReturning(null);
    }
  };

  // Apply filters
  const filtered = checkouts.filter((co) => {
    if (typeFilter !== "all" && co.type !== typeFilter) return false;
    if (dueFilter !== "all") {
      const status = getDueStatus(co.dueDate);
      if (dueFilter === "due-soon" && status !== "due-soon" && status !== "overdue") return false;
      if (dueFilter === "overdue" && status !== "overdue") return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        co.itemName.toLowerCase().includes(q) ||
        co.teacherName.toLowerCase().includes(q) ||
        co.itemDetail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Counts
  const bookCount = checkouts.filter((c) => c.type === "book").length;
  const themeCount = checkouts.filter((c) => c.type === "theme").length;
  const resourceCount = checkouts.filter((c) => c.type === "resource").length;
  const dueSoonCount = checkouts.filter((c) => getDueStatus(c.dueDate) === "due-soon").length;
  const overdueCount = checkouts.filter((c) => getDueStatus(c.dueDate) === "overdue").length;

  return (
    <div className="space-y-6">
      <AdminHeader
        icon="📋"
        title="Active Checkouts"
        description={`${checkouts.length} item${checkouts.length !== 1 ? "s" : ""} currently checked out`}
      />

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="border rounded-xl p-4 bg-indigo-50 border-indigo-200">
          <div className="text-2xl font-bold text-indigo-800">
            {checkouts.length}
          </div>
          <div className="text-xs text-indigo-600 mt-1">Total Active</div>
        </div>
        <div className="border rounded-xl p-4 bg-blue-50 border-blue-200">
          <div className="text-2xl font-bold text-blue-800">{bookCount}</div>
          <div className="text-xs text-blue-600 mt-1">📖 Books</div>
        </div>
        <div className="border rounded-xl p-4 bg-amber-50 border-amber-200">
          <div className="text-2xl font-bold text-amber-800">{themeCount}</div>
          <div className="text-xs text-amber-600 mt-1">🎨 Themes</div>
        </div>
        <div className="border rounded-xl p-4 bg-green-50 border-green-200">
          <div className="text-2xl font-bold text-green-800">
            {resourceCount}
          </div>
          <div className="text-xs text-green-600 mt-1">📦 Resources</div>
        </div>
        <div className="border rounded-xl p-4 bg-yellow-50 border-yellow-200">
          <div className="text-2xl font-bold text-yellow-800">{dueSoonCount}</div>
          <div className="text-xs text-yellow-600 mt-1">⏰ Due Soon</div>
        </div>
        <div className="border rounded-xl p-4 bg-red-50 border-red-200">
          <div className="text-2xl font-bold text-red-800">{overdueCount}</div>
          <div className="text-xs text-red-600 mt-1">⚠️ Overdue</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by title, teacher, or detail..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
        <div className="flex gap-1">
          {(["all", "book", "theme", "resource"] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                typeFilter === t
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t === "all"
                ? "All"
                : `${TYPE_ICON[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}s`}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {([
            { key: "all" as DueFilter, label: "All Due" },
            { key: "due-soon" as DueFilter, label: "⏰ Due Soon" },
            { key: "overdue" as DueFilter, label: "⚠️ Overdue" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDueFilter(key)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                dueFilter === key
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Checkout list */}
      {loading ? (
        <p className="text-gray-500 text-center py-12">Loading checkouts…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">
            {checkouts.length === 0
              ? "No active checkouts 🎉"
              : "No checkouts match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((co) => {
            const status = getDueStatus(co.dueDate);
            const badgeClass = DUE_BADGE[status];
            const borderClass = status === "overdue" ? "border-red-300" : status === "due-soon" ? "border-amber-300" : "border-gray-200";

            return (
              <div
                key={co.id}
                className={`flex items-center justify-between p-4 bg-white border rounded-xl ${borderClass}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg flex-shrink-0">
                      {TYPE_ICON[co.type]}
                    </span>
                    <span className="font-medium text-gray-900 truncate">
                      {co.itemName}
                    </span>
                    {co.availability && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          co.availability.available > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {co.availability.available}/{co.availability.total}
                      </span>
                    )}
                    {badgeClass && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badgeClass}`}>
                        {status === "overdue" ? "⚠️ Overdue" : "⏰ Due Soon"}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 ml-7">
                    {co.itemDetail && <>{co.itemDetail} · </>}
                    <span className="font-medium">{co.teacherName}</span> ·{" "}
                    {new Date(co.checkedOutAt).toLocaleDateString()}
                    {" · Due "}
                    <span className={status === "overdue" ? "text-red-600 font-medium" : status === "due-soon" ? "text-amber-600 font-medium" : ""}>
                      {new Date(co.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleForceReturn(co)}
                  disabled={returning === co.id}
                  className="ml-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium whitespace-nowrap flex-shrink-0 disabled:opacity-50 transition-colors"
                >
                  {returning === co.id ? "Returning…" : "Force Return"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
