"use client";

import { useEffect, useState } from "react";

interface ActiveCheckout {
  id: string;
  type: string;
  checkedOutAt: string;
  book: { id: string; title: string; author: string; category: { name: string } | null } | null;
  resourceCategory: { id: string; name: string } | null;
  teacher: { name: string };
}

interface TopBook {
  bookId: string;
  count: number;
  title: string;
  author: string;
  coverImageUrl: string | null;
  category: { name: string } | null;
}

interface TopTheme {
  resourceCategoryId: string;
  count: number;
  name: string;
  itemCount: number;
}

type Tab = "active" | "popular";
type TimeWindow = 7 | 30 | 90;

export default function CheckedOutPage() {
  const [tab, setTab] = useState<Tab>("active");

  // Active checkouts state
  const [checkouts, setCheckouts] = useState<ActiveCheckout[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [themeItems, setThemeItems] = useState<Record<string, { resources: string[]; books: string[] }>>({});

  // Popular state
  const [topBooks, setTopBooks] = useState<TopBook[]>([]);
  const [topThemes, setTopThemes] = useState<TopTheme[]>([]);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(30);
  const [loadingPopular, setLoadingPopular] = useState(false);

  useEffect(() => {
    setLoadingActive(true);
    fetch("/api/checkouts")
      .then((r) => r.json())
      .then(setCheckouts)
      .finally(() => setLoadingActive(false));
  }, []);

  useEffect(() => {
    if (tab !== "popular") return;
    setLoadingPopular(true);
    fetch(`/api/checkouts/stats?days=${timeWindow}`)
      .then((r) => r.json())
      .then((data) => {
        setTopBooks(data.topBooks);
        setTopThemes(data.topThemes);
      })
      .finally(() => setLoadingPopular(false));
  }, [tab, timeWindow]);

  const toggleThemeExpand = async (resourceCategoryId: string) => {
    const next = new Set(expandedThemes);
    if (next.has(resourceCategoryId)) {
      next.delete(resourceCategoryId);
      setExpandedThemes(next);
      return;
    }
    next.add(resourceCategoryId);
    setExpandedThemes(next);

    if (!themeItems[resourceCategoryId]) {
      const res = await fetch(`/api/resource-categories/${resourceCategoryId}/items`);
      if (res.ok) {
        const data = await res.json();
        setThemeItems((prev) => ({ ...prev, [resourceCategoryId]: data }));
      }
    }
  };

  const bookCheckouts = checkouts.filter((c) => c.type === "BOOK" || !c.type);
  const themeCheckouts = checkouts.filter((c) => c.type === "THEME");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">📊 Checked Out &amp; Popular</h1>

      {/* Tab toggle */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === "active"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          📋 Currently Checked Out
        </button>
        <button
          onClick={() => setTab("popular")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === "popular"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          🔥 Most Popular
        </button>
      </div>

      {/* ===== ACTIVE TAB ===== */}
      {tab === "active" && (
        <div className="space-y-6">
          {loadingActive ? (
            <p className="text-gray-500 text-center py-8">Loading…</p>
          ) : checkouts.length === 0 ? (
            <p className="text-gray-500 bg-gray-50 rounded-lg p-8 text-center">
              Nothing is currently checked out 🎉
            </p>
          ) : (
            <>
              {/* Theme checkouts */}
              {themeCheckouts.length > 0 && (
                <div>
                  <h2 className="font-semibold text-gray-800 mb-3">
                    📚 Teacher Resource Themes ({themeCheckouts.length})
                  </h2>
                  <div className="space-y-2">
                    {themeCheckouts.map((co) => (
                      <div key={co.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🎨</span>
                            <div>
                              <span className="font-medium">{co.resourceCategory?.name}</span>
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                                Checked Out
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 text-right">
                            <div>
                              by <span className="font-medium">{co.teacher.name}</span>
                            </div>
                            <div>{new Date(co.checkedOutAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        {co.resourceCategory && (
                          <button
                            onClick={() => toggleThemeExpand(co.resourceCategory!.id)}
                            className="mt-2 text-sm text-amber-700 hover:text-amber-900 underline"
                          >
                            {expandedThemes.has(co.resourceCategory.id)
                              ? "Hide items ▲"
                              : "Show included items ▼"}
                          </button>
                        )}
                        {co.resourceCategory && expandedThemes.has(co.resourceCategory.id) && (
                          <div className="mt-2 ml-8 text-sm text-gray-600 bg-white rounded p-3 border border-amber-100">
                            {themeItems[co.resourceCategory.id] ? (
                              <>
                                {themeItems[co.resourceCategory.id].resources.length > 0 && (
                                  <div className="mb-2">
                                    <span className="font-medium text-gray-700">Resources:</span>
                                    <ul className="list-disc list-inside ml-2">
                                      {themeItems[co.resourceCategory.id].resources.map((name, i) => (
                                        <li key={i}>{name}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {themeItems[co.resourceCategory.id].books.length > 0 && (
                                  <div>
                                    <span className="font-medium text-gray-700">Books:</span>
                                    <ul className="list-disc list-inside ml-2">
                                      {themeItems[co.resourceCategory.id].books.map((name, i) => (
                                        <li key={i}>{name}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {themeItems[co.resourceCategory.id].resources.length === 0 &&
                                  themeItems[co.resourceCategory.id].books.length === 0 && (
                                    <p className="text-gray-400 italic">No items in this theme yet.</p>
                                  )}
                              </>
                            ) : (
                              <p className="text-gray-400">Loading…</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Book checkouts */}
              {bookCheckouts.length > 0 && (
                <div>
                  <h2 className="font-semibold text-gray-800 mb-3">
                    📖 Individual Books ({bookCheckouts.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-gray-600">
                          <th className="px-4 py-2 font-medium">Title</th>
                          <th className="px-4 py-2 font-medium">Author</th>
                          <th className="px-4 py-2 font-medium">Category</th>
                          <th className="px-4 py-2 font-medium">Checked Out By</th>
                          <th className="px-4 py-2 font-medium">Date</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {bookCheckouts.map((co) => (
                          <tr key={co.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{co.book?.title}</td>
                            <td className="px-4 py-3 text-gray-600">{co.book?.author}</td>
                            <td className="px-4 py-3 text-gray-500">{co.book?.category?.name ?? "—"}</td>
                            <td className="px-4 py-3">{co.teacher.name}</td>
                            <td className="px-4 py-3 text-gray-500">
                              {new Date(co.checkedOutAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                Checked Out
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== POPULAR TAB ===== */}
      {tab === "popular" && (
        <div className="space-y-6">
          {/* Time window selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Time window:</span>
            {([7, 30, 90] as TimeWindow[]).map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  timeWindow === w
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {w} days
              </button>
            ))}
          </div>

          {loadingPopular ? (
            <p className="text-gray-500 text-center py-8">Loading…</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top Books */}
              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-800 mb-4">📖 Top Books</h2>
                {topBooks.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No book checkouts in this period.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topBooks.map((book, i) => (
                      <div key={book.bookId} className="flex items-center gap-3">
                        <span className={`text-lg font-bold w-7 text-center ${
                          i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-300"
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{book.title}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {book.author}
                            {book.category && <> · {book.category.name}</>}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-indigo-600 whitespace-nowrap">
                          {book.count}×
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Themes */}
              <div className="bg-white border rounded-xl p-5">
                <h2 className="font-semibold text-gray-800 mb-4">🎨 Top Themes</h2>
                {topThemes.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No theme checkouts in this period.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topThemes.map((theme, i) => (
                      <div key={theme.resourceCategoryId} className="flex items-center gap-3">
                        <span className={`text-lg font-bold w-7 text-center ${
                          i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-300"
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{theme.name}</div>
                          <div className="text-xs text-gray-500">
                            Includes {theme.itemCount} item{theme.itemCount !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-amber-600 whitespace-nowrap">
                          {theme.count}×
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
