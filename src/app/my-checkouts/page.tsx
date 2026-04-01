"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/components/RoleProvider";
import { useRouter } from "next/navigation";

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

type DueStatus = "normal" | "due-soon" | "overdue";

function getDueStatus(dueDate: string): DueStatus {
  const now = new Date();
  const due = new Date(dueDate);
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 3) return "due-soon";
  return "normal";
}

const DUE_STYLES: Record<DueStatus, { badge: string; border: string; label: string }> = {
  normal: { badge: "bg-gray-100 text-gray-600", border: "border-gray-200", label: "" },
  "due-soon": { badge: "bg-amber-100 text-amber-700", border: "border-amber-300", label: "Due Soon" },
  overdue: { badge: "bg-red-100 text-red-700", border: "border-red-300", label: "Overdue" },
};

const TYPE_ICON: Record<string, string> = {
  book: "📖",
  theme: "🎨",
  resource: "📦",
};

const TYPE_LABEL: Record<string, string> = {
  book: "Book",
  theme: "Theme",
  resource: "Resource",
};

export default function MyCheckoutsPage() {
  const { role, teacherId, teacherName } = useRole();
  const router = useRouter();
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Redirect if no teacher identity
  useEffect(() => {
    if (role === "teacher" && !teacherId) {
      router.replace("/");
    }
  }, [role, teacherId, router]);

  const fetchMyCheckouts = () => {
    setLoading(true);
    fetch("/api/active-checkouts")
      .then((r) => r.json())
      .then((all: CheckoutRecord[]) =>
        setCheckouts(all.filter((co) => co.teacherId === teacherId))
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (teacherId) fetchMyCheckouts();
  }, [teacherId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReturn = async (co: CheckoutRecord) => {
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
          text: `${TYPE_ICON[co.type]} "${co.itemName}" returned!`,
        });
        fetchMyCheckouts();
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

  const bookCount = checkouts.filter((c) => c.type === "book").length;
  const themeCount = checkouts.filter((c) => c.type === "theme").length;
  const resourceCount = checkouts.filter((c) => c.type === "resource").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          📋 My Checked Out Items
        </h1>
        {teacherName && (
          <p className="text-gray-500 mt-1">
            Showing items checked out by{" "}
            <span className="font-medium text-gray-700">{teacherName}</span>
          </p>
        )}
      </div>

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

      {/* Summary badges */}
      {!loading && checkouts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bookCount > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
              📖 {bookCount} book{bookCount !== 1 ? "s" : ""}
            </span>
          )}
          {themeCount > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
              🎨 {themeCount} theme{themeCount !== 1 ? "s" : ""}
            </span>
          )}
          {resourceCount > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
              📦 {resourceCount} resource{resourceCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-gray-500 text-center py-12">Loading your items…</p>
      ) : checkouts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-1">
            All clear!
          </h2>
          <p className="text-gray-500">
            You don&apos;t have any items checked out right now.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {checkouts.map((co) => {
            const status = getDueStatus(co.dueDate);
            const style = DUE_STYLES[status];

            return (
              <div
                key={co.id}
                className={`flex items-center justify-between p-4 bg-white border rounded-xl ${style.border}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg flex-shrink-0">
                      {TYPE_ICON[co.type]}
                    </span>
                    <span className="font-medium text-gray-900 truncate">
                      {co.itemName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                      {TYPE_LABEL[co.type]}
                    </span>
                    {style.label && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${style.badge}`}>
                        {status === "overdue" ? "⚠️ " : "⏰ "}{style.label}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 ml-7">
                    {co.itemDetail && <>{co.itemDetail} · </>}
                    {new Date(co.checkedOutAt).toLocaleDateString()}
                    {" · Due "}
                    <span className={status === "overdue" ? "text-red-600 font-medium" : status === "due-soon" ? "text-amber-600 font-medium" : ""}>
                      {new Date(co.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleReturn(co)}
                  disabled={returning === co.id}
                  className="ml-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium whitespace-nowrap flex-shrink-0 disabled:opacity-50 transition-colors"
                >
                  {returning === co.id ? "Returning…" : "Return"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
