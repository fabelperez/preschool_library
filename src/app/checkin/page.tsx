"use client";

import { useState, useEffect } from "react";
import { useRole } from "@/components/RoleProvider";
import BarcodeScanner from "@/components/BarcodeScanner";

interface CheckoutRecord {
  id: string;
  type: "book" | "theme" | "resource";
  itemName: string;
  itemDetail: string;
  isbn: string | null;
  teacherId: string;
  teacherName: string;
  checkedOutAt: string;
  availability: { available: number; total: number } | null;
}

interface Teacher {
  id: string;
  name: string;
}

const TYPE_ICON: Record<string, string> = {
  book: "📖",
  theme: "🎨",
  resource: "📦",
};

const TYPE_LABEL: Record<string, string> = {
  book: "Books",
  theme: "Themes",
  resource: "Resources",
};

export default function CheckinPage() {
  const { role, teacherId: sessionTeacherId, teacherName: sessionTeacherName } = useRole();
  const isLibrarian = role === "librarian";

  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Auto-fill teacher identity when locked to session
  useEffect(() => {
    if (!isLibrarian && sessionTeacherId) {
      setSelectedTeacherId(sessionTeacherId);
    }
  }, [isLibrarian, sessionTeacherId]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/active-checkouts").then((r) => r.json()),
      fetch("/api/teachers").then((r) => r.json()),
    ])
      .then(([checkoutsData, teachersData]) => {
        setCheckouts(checkoutsData);
        setTeachers(teachersData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const canReturn = (co: CheckoutRecord) => {
    if (isLibrarian) return true;
    return selectedTeacherId === co.teacherId;
  };

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
          text: `${TYPE_ICON[co.type]} "${co.itemName}" returned by ${co.teacherName}!`,
        });
        fetchData();
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

  const handleScan = async (isbn: string) => {
    setMessage(null);

    // In teacher mode, restrict to their checkout
    const teacherFilter =
      !isLibrarian && selectedTeacherId ? selectedTeacherId : undefined;

    try {
      const res = await fetch("/api/checkouts/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn, ...(teacherFilter && { teacherId: teacherFilter }) }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({
          type: "success",
          text: `📖 "${data.book.title}" returned by ${data.teacher.name}!`,
        });
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Return failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    }
  };

  // Group checkouts by type
  const grouped = checkouts.reduce(
    (acc, co) => {
      acc[co.type] = acc[co.type] || [];
      acc[co.type].push(co);
      return acc;
    },
    {} as Record<string, CheckoutRecord[]>
  );

  const teacherReady = isLibrarian || selectedTeacherId;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">↩️ Return Items</h1>

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

      {/* Teacher identification (teacher role only) */}
      {!isLibrarian && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          {sessionTeacherId ? (
            <p className="font-semibold text-purple-800">
              👋 Returning items as {sessionTeacherName}
            </p>
          ) : (
            <>
              <h2 className="font-semibold text-purple-800 mb-2">
                👋 Who are you?
              </h2>
              <p className="text-sm text-purple-600 mb-3">
                Select your name to return your items. You can see what everyone has
                checked out!
              </p>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select your name...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* Barcode scanner */}
      {teacherReady && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <h2 className="font-semibold text-indigo-800 mb-3">
            Scan Book Barcode to Return
          </h2>
          <BarcodeScanner
            onScan={handleScan}
            placeholder="Scan ISBN to check in..."
          />
        </div>
      )}

      {/* Checkout list */}
      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading checkouts…</p>
      ) : checkouts.length === 0 ? (
        <p className="text-gray-500 bg-gray-50 rounded-lg p-8 text-center">
          Nothing is currently checked out — everything&apos;s home! 🎉
        </p>
      ) : (
        <div className="space-y-6">
          {(["book", "theme", "resource"] as const).map((type) => {
            const items = grouped[type];
            if (!items || items.length === 0) return null;

            return (
              <div key={type}>
                <h2 className="font-semibold text-gray-800 mb-3">
                  {TYPE_ICON[type]} {TYPE_LABEL[type]} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((co) => {
                    const isOwn = selectedTeacherId === co.teacherId;
                    const canReturnThis = canReturn(co);

                    return (
                      <div
                        key={co.id}
                        className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${
                          !isLibrarian && isOwn
                            ? "bg-purple-50 border-purple-200"
                            : "bg-white border-gray-200"
                        }`}
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
                                {co.availability.available}/
                                {co.availability.total}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5 ml-7">
                            {co.itemDetail && <>{co.itemDetail} · </>}
                            <span className="font-medium">
                              {co.teacherName}
                            </span>{" "}
                            ·{" "}
                            {new Date(co.checkedOutAt).toLocaleDateString()}
                          </div>
                        </div>

                        <button
                          onClick={() => handleReturn(co)}
                          disabled={!canReturnThis || returning === co.id}
                          className={`ml-3 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                            canReturnThis
                              ? "bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          title={
                            canReturnThis
                              ? "Return this item"
                              : "You can only return your own items"
                          }
                        >
                          {returning === co.id ? "Returning…" : "Return"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
