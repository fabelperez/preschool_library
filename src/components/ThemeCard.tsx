"use client";

import { useState } from "react";

interface ThemeItems {
  resources: string[];
  books: string[];
}

interface Teacher {
  id: string;
  name: string;
}

export interface ActiveThemeCheckout {
  id: string;
  teacherName: string;
  checkedOutAt: string;
}

export interface ThemeCardProps {
  id: string;
  name: string;
  description: string | null;
  resourceCount: number;
  bookCount: number;
  activeCheckout: ActiveThemeCheckout | null;
  teachers: Teacher[];
  onCheckoutChange: () => void;
}

export default function ThemeCard({
  id,
  name,
  description,
  resourceCount,
  bookCount,
  activeCheckout: initialCheckout,
  teachers,
  onCheckoutChange,
}: ThemeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<ThemeItems | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [localCheckout, setLocalCheckout] = useState<ActiveThemeCheckout | null>(initialCheckout);

  const totalItems = resourceCount + bookCount;
  const isCheckedOut = !!localCheckout;

  async function handleToggleItems() {
    if (!expanded && !items) {
      setItemsLoading(true);
      try {
        const res = await fetch(`/api/resource-categories/${id}/items`);
        const data = await res.json();
        setItems(data);
      } catch {
        // silently ignore
      } finally {
        setItemsLoading(false);
      }
    }
    setExpanded((prev) => !prev);
  }

  async function handleCheckout() {
    if (!selectedTeacherId) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "THEME", resourceCategoryId: id, teacherId: selectedTeacherId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to check out" });
      } else {
        const teacher = teachers.find((t) => t.id === selectedTeacherId);
        setLocalCheckout({
          id: data.id,
          teacherName: teacher?.name ?? "Unknown",
          checkedOutAt: data.checkedOutAt,
        });
        setSelectedTeacherId("");
        setMessage({ type: "success", text: `Checked out to ${teacher?.name}!` });
        onCheckoutChange();
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReturn() {
    if (!localCheckout) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/checkouts/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: localCheckout.id }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Returned successfully!" });
        setLocalCheckout(null);
        onCheckoutChange();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to return" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div
      className={`border-2 rounded-xl p-4 bg-white transition-all ${
        isCheckedOut ? "border-red-200 bg-red-50/30" : "border-amber-200"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-tight">🎨 {name}</h3>
          {description ? (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{description}</p>
          ) : (
            <p className="text-sm text-gray-300 mt-0.5 italic">No description</p>
          )}
        </div>
        <span
          className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
            isCheckedOut ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}
        >
          {isCheckedOut ? "Out" : "Available"}
        </span>
      </div>

      {/* Count badges */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
          🧩 {resourceCount} resource{resourceCount !== 1 ? "s" : ""}
        </span>
        <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
          📕 {bookCount} book{bookCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Checked-out-by info */}
      {isCheckedOut && localCheckout && (
        <p className="text-xs text-red-600 mt-2">
          Checked out by <strong>{localCheckout.teacherName}</strong> on{" "}
          {new Date(localCheckout.checkedOutAt).toLocaleDateString()}
        </p>
      )}

      {/* Action row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isCheckedOut ? (
          <button
            onClick={handleReturn}
            disabled={actionLoading}
            className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? "Returning…" : "↩ Return"}
          </button>
        ) : (
          <>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="flex-1 min-w-[130px] text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              <option value="">Select teacher…</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleCheckout}
              disabled={!selectedTeacherId || actionLoading}
              className="px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors"
            >
              {actionLoading ? "Checking out…" : "Check Out"}
            </button>
          </>
        )}

        {totalItems > 0 && (
          <button
            onClick={handleToggleItems}
            className="ml-auto text-sm text-indigo-500 hover:text-indigo-700 hover:underline whitespace-nowrap"
          >
            {expanded ? "▲ Hide" : `▼ ${totalItems} items`}
          </button>
        )}
      </div>

      {/* Inline feedback message */}
      {message && (
        <p
          className={`text-xs mt-2 font-medium ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Expandable items list */}
      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {itemsLoading ? (
            <p className="text-xs text-gray-400 animate-pulse">Loading items…</p>
          ) : items ? (
            <div className="space-y-3">
              {items.resources.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Resources
                  </p>
                  <ul className="space-y-0.5">
                    {items.resources.map((r, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-center gap-1.5">
                        <span>🧩</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {items.books.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Books
                  </p>
                  <ul className="space-y-0.5">
                    {items.books.map((b, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-center gap-1.5">
                        <span>📕</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {items.resources.length === 0 && items.books.length === 0 && (
                <p className="text-xs text-gray-400">No items assigned to this theme yet.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Could not load items.</p>
          )}
        </div>
      )}
    </div>
  );
}
