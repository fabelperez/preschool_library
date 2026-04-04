"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActiveCheckout {
  id: string;
  type: "book" | "theme" | "resource";
  itemName: string;
  itemDetail: string;
  teacherName: string;
  checkedOutAt: string;
  dueDate: string;
}

interface ResourceCategory {
  id: string;
  name: string;
  _count: { resources: number };
}

interface BookSummary {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  totalCopies: number;
  resourceCategoryId: string | null;
  category: { name: string } | null;
}

interface ResourceSummary {
  id: string;
  name: string;
  quantity: number;
  resourceCategory: { id: string; name: string };
  bin: { label: string | null; number: number; shelf: { name: string } };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TABS = ["Active Checkouts", "Overdue", "Theme Bundles", "Inventory"] as const;
type Tab = typeof TABS[number];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysOverdue(dueDate: string) {
  return Math.floor((Date.now() - new Date(dueDate).getTime()) / 86_400_000);
}

const TYPE_LABEL: Record<string, string> = { book: "📚 Book", theme: "🎨 Theme", resource: "📦 Resource" };

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Active Checkouts");
  const [loading, setLoading] = useState(true);

  const [checkouts, setCheckouts] = useState<ActiveCheckout[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [resources, setResources] = useState<ResourceSummary[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/active-checkouts").then((r) => r.json()),
      fetch("/api/resource-categories").then((r) => r.json()),
      fetch("/api/books").then((r) => r.json()),
      fetch("/api/resources").then((r) => r.json()),
    ]).then(([co, cats, bks, res]) => {
      setCheckouts(Array.isArray(co) ? co : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setBooks(Array.isArray(bks) ? bks : []);
      setResources(Array.isArray(res.resources) ? res.resources : []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const overdue = checkouts.filter((c) => new Date(c.dueDate) < new Date());

  if (loading) return <div className="text-center py-12 text-gray-500">Loading reports...</div>;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          nav, [data-no-print] { display: none !important; }
          body { background: white !important; }
          .print-title { display: block !important; }
          .print-section { display: block !important; }
          .print-section + .print-section { page-break-before: always; margin-top: 0; }
          .print-section-header { display: block !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
        .print-title { display: none; }
        .print-section-header { display: none; }
        .screen-hidden { display: none; }
      `}</style>

      <div className="space-y-6">
        <AdminHeader
          icon="📊"
          title="Reports"
          description="Printable library reports for Meggie"
          action={
            <button
              data-no-print
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-medium"
            >
              🖨️ Print
            </button>
          }
        />

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto" data-no-print>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "border-gray-800 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Print header (hidden on screen) */}
        <div className="print-title">
          <h1 className="text-2xl font-bold">Library Reports — Little Library</h1>
          <p className="text-sm text-gray-500">Printed {now}</p>
        </div>

        {/* ── Active Checkouts ── */}
        <div className={`print-section${activeTab !== "Active Checkouts" ? " screen-hidden" : ""}`}>
          <h2 className="print-section-header text-xl font-bold mb-3 mt-2">Active Checkouts</h2>
          <section className="bg-white border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Active Checkouts</h2>
              <span className="text-sm text-gray-500">{checkouts.length} item{checkouts.length !== 1 ? "s" : ""} out</span>
            </div>
            {checkouts.length === 0 ? (
              <p className="p-6 text-gray-500 text-sm">Nothing currently checked out.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Teacher</th>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Checked Out</th>
                      <th className="px-4 py-3 text-left">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {checkouts.map((co) => (
                      <tr key={co.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{co.teacherName}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{co.itemName}</div>
                          {co.itemDetail && <div className="text-xs text-gray-400">{co.itemDetail}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{TYPE_LABEL[co.type] ?? co.type}</td>
                        <td className="px-4 py-3 text-gray-600">{fmt(co.checkedOutAt)}</td>
                        <td className="px-4 py-3">
                          {new Date(co.dueDate) < new Date()
                            ? <span className="text-red-600 font-medium">{fmt(co.dueDate)} ⚠</span>
                            : <span className="text-gray-600">{fmt(co.dueDate)}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* ── Overdue ── */}
        <div className={`print-section${activeTab !== "Overdue" ? " screen-hidden" : ""}`}>
          <h2 className="print-section-header text-xl font-bold mb-3 mt-2">Overdue Items</h2>
          <section className="bg-white border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b bg-red-50 flex items-center justify-between">
              <h2 className="font-semibold text-red-800">Overdue Items</h2>
              <span className="text-sm text-red-600 font-medium">{overdue.length} overdue</span>
            </div>
            {overdue.length === 0 ? (
              <p className="p-6 text-gray-500 text-sm">✅ No overdue items — all good!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-red-50 text-red-700 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Teacher</th>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Due</th>
                      <th className="px-4 py-3 text-left">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50">
                    {overdue
                      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                      .map((co) => {
                        const days = daysOverdue(co.dueDate);
                        return (
                          <tr key={co.id} className={days >= 7 ? "bg-red-50" : "hover:bg-red-50/40"}>
                            <td className="px-4 py-3 font-medium text-gray-800">{co.teacherName}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-800">{co.itemName}</div>
                              {co.itemDetail && <div className="text-xs text-gray-400">{co.itemDetail}</div>}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{TYPE_LABEL[co.type] ?? co.type}</td>
                            <td className="px-4 py-3 text-red-600 font-medium">{fmt(co.dueDate)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                days >= 14 ? "bg-red-600 text-white" :
                                days >= 7  ? "bg-red-200 text-red-800" :
                                             "bg-amber-100 text-amber-800"
                              }`}>
                                {days}d overdue
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* ── Theme Bundles ── */}
        <div className={`print-section${activeTab !== "Theme Bundles" ? " screen-hidden" : ""}`}>
          <h2 className="print-section-header text-xl font-bold mb-3 mt-2">Theme Bundles</h2>
          <div className="space-y-4">
            {categories.length === 0 && (
              <p className="text-gray-500 text-sm">No themes configured yet.</p>
            )}
            {categories.map((cat) => {
              const themeBooks = books.filter((b) => b.resourceCategoryId === cat.id);
              return (
                <section key={cat.id} className="bg-white border rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b bg-green-50 flex items-center justify-between">
                    <h2 className="font-semibold text-green-800">🎨 {cat.name}</h2>
                    <div className="flex gap-3 text-sm text-green-700">
                      <span>{themeBooks.length} book{themeBooks.length !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{cat._count.resources} resource{cat._count.resources !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  {themeBooks.length === 0 ? (
                    <p className="px-5 py-3 text-sm text-gray-400 italic">No books assigned to this theme.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                          <th className="px-4 py-2 text-left">Title</th>
                          <th className="px-4 py-2 text-left">Author</th>
                          <th className="px-4 py-2 text-left">ISBN</th>
                          <th className="px-4 py-2 text-right">Copies</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {themeBooks.map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-800">{b.title}</td>
                            <td className="px-4 py-2.5 text-gray-600">{b.author}</td>
                            <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{b.isbn ?? "—"}</td>
                            <td className="px-4 py-2.5 text-gray-600 text-right">{b.totalCopies}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {/* ── Inventory ── */}
        <div className={`print-section${activeTab !== "Inventory" ? " screen-hidden" : ""}`}>
          <h2 className="print-section-header text-xl font-bold mb-3 mt-2">Inventory</h2>
          <div className="space-y-6">
            {/* Books */}
            <section className="bg-white border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b bg-blue-50 flex items-center justify-between">
                <h2 className="font-semibold text-blue-800">📚 Books</h2>
                <span className="text-sm text-blue-600">{books.length} title{books.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Author</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Theme</th>
                      <th className="px-4 py-3 text-right">Copies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...books]
                      .sort((a, b) => (a.category?.name ?? "zzz").localeCompare(b.category?.name ?? "zzz") || a.title.localeCompare(b.title))
                      .map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{b.title}</td>
                          <td className="px-4 py-2.5 text-gray-600">{b.author}</td>
                          <td className="px-4 py-2.5 text-gray-500">{b.category?.name ?? "—"}</td>
                          <td className="px-4 py-2.5 text-gray-500">
                            {b.resourceCategoryId
                              ? (categories.find((c) => c.id === b.resourceCategoryId)?.name ?? "—")
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 text-right">{b.totalCopies}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Resources */}
            <section className="bg-white border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b bg-green-50 flex items-center justify-between">
                <h2 className="font-semibold text-green-800">📦 Resources</h2>
                <span className="text-sm text-green-600">{resources.length} item{resources.length !== 1 ? "s" : ""}</span>
              </div>
              {resources.length === 0 ? (
                <p className="p-6 text-gray-500 text-sm">No resources configured yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Theme</th>
                        <th className="px-4 py-3 text-left">Location</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...resources]
                        .sort((a, b) => a.resourceCategory.name.localeCompare(b.resourceCategory.name) || a.name.localeCompare(b.name))
                        .map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-800">{r.name}</td>
                            <td className="px-4 py-2.5 text-gray-600">{r.resourceCategory.name}</td>
                            <td className="px-4 py-2.5 text-gray-500">
                              {r.bin.shelf.name} → {r.bin.label || `Bin ${r.bin.number}`}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 text-right">{r.quantity}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
