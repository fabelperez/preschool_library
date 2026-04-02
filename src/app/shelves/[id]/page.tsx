"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BookCard from "@/components/BookCard";
import { useRole } from "@/components/RoleProvider";

interface Book {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  totalCopies: number;
  checkouts: { returnedAt: string | null; teacher: { name: string }; checkedOutAt: string }[];
}

interface BinResource {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  resourceCategory: { id: string; name: string } | null;
  checkouts: { returnedAt: string | null }[];
}

interface BinBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  totalCopies: number;
  category: { id: string; name: string } | null;
  resourceCategory: { id: string; name: string } | null;
  resource: { resourceCategory: { id: string; name: string } | null } | null;
  checkouts: { returnedAt: string | null }[];
}

interface Bin {
  id: string;
  number: number;
  label: string | null;
  theme: string;
  resources: BinResource[];
  books: BinBook[];
}

interface Section {
  id: string;
  label: string | null;
  category: { id: string; name: string; books: Book[] };
}

interface Shelf {
  id: string;
  name: string;
  type: string;
  sections: Section[];
  bins: Bin[];
}

export default function ShelfDetailPage() {
  const params = useParams();
  const { teacherId, teacherName } = useRole();
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  const fetchShelf = useCallback(() => {
    fetch(`/api/shelves/${params.id}`)
      .then((r) => r.json())
      .then(setShelf)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { fetchShelf(); }, [fetchShelf]);

  const handleBookCheckout = async (bookId: string, bookTitle: string) => {
    if (!teacherId) {
      setCheckoutMessage({ type: "warning", text: "Please select your identity on the home page before checking out." });
      return;
    }

    setCheckoutLoadingId(bookId);
    setCheckoutMessage(null);

    try {
      const res = await fetch("/api/checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "BOOK", bookId, teacherId }),
      });

      if (res.ok) {
        setCheckoutMessage({ type: "success", text: `"${bookTitle}" checked out to ${teacherName}!` });
        fetchShelf();
      } else {
        const err = await res.json();
        setCheckoutMessage({
          type: res.status === 403 ? "warning" : "error",
          text: err.error || "Checkout failed",
        });
      }
    } catch {
      setCheckoutMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setCheckoutLoadingId(null);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading shelf...</div>;
  if (!shelf) return <div className="text-center py-12 text-red-500">Shelf not found</div>;

  const isResourceShelf = shelf.type === "resource" || shelf.bins.length > 0;

  return (
    <div className="space-y-6">
      <Link href="/library" className="text-indigo-600 hover:underline text-sm">← Back to library</Link>

      <h1 className="text-2xl font-bold text-gray-900">🗄️ {shelf.name}</h1>

      {/* Checkout feedback */}
      {checkoutMessage && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            checkoutMessage.type === "success"
              ? "bg-green-100 text-green-800"
              : checkoutMessage.type === "warning"
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {checkoutMessage.text}
          <button onClick={() => setCheckoutMessage(null)} className="ml-2 underline text-xs">dismiss</button>
        </div>
      )}

      {/* ---- General book sections ---- */}
      {shelf.sections.length > 0 && (
        <div className="space-y-8">
          {shelf.sections.map((section) => {
            const books = section.category.books;
            return (
              <div key={section.id} className="border-2 border-amber-200 rounded-xl p-5 bg-amber-50">
                <h2 className="font-bold text-lg text-amber-900 mb-1">
                  {section.label || section.category.name}
                </h2>
                <p className="text-sm text-amber-700 mb-4">Category: {section.category.name}</p>

                {books.length === 0 ? (
                  <p className="text-gray-500 text-sm">No books in this section yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {books.map((book) => {
                      const activeCheckouts = book.checkouts.filter((c) => !c.returnedAt);
                      const availableCopies = book.totalCopies - activeCheckouts.length;
                      return (
                        <div key={book.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <BookCard
                              id={book.id}
                              title={book.title}
                              author={book.author}
                              coverImageUrl={book.coverImageUrl}
                              categoryName={section.category.name}
                              totalCopies={book.totalCopies}
                              availableCopies={availableCopies}
                              checkedOutBy={activeCheckouts.map((c) => ({
                                teacherName: c.teacher.name,
                                checkedOutAt: c.checkedOutAt,
                              }))}
                              shelfLocation={shelf.name}
                            />
                          </div>
                          <button
                            onClick={() => handleBookCheckout(book.id, book.title)}
                            disabled={availableCopies <= 0 || checkoutLoadingId === book.id}
                            className="flex-shrink-0 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {checkoutLoadingId === book.id ? "Processing..." : "✅ Check Out"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Resource bins grouped by theme ---- */}
      {shelf.bins.length > 0 && (
        <div className="space-y-6">
          {!isResourceShelf && shelf.sections.length > 0 && (
            <h2 className="text-lg font-bold text-gray-800 mt-4">📦 Resource Bins</h2>
          )}
          {shelf.bins.map((bin) => {
            // Group all items in this bin by theme
            const themeMap = new Map<string, {
              resources: (BinResource & { available: number })[];
              books: (BinBook & { available: number })[];
            }>();

            for (const r of bin.resources) {
              const theme = r.resourceCategory?.name || bin.theme || "General";
              if (!themeMap.has(theme)) themeMap.set(theme, { resources: [], books: [] });
              const activeCount = r.checkouts.filter((c) => !c.returnedAt).length;
              themeMap.get(theme)!.resources.push({ ...r, available: r.quantity - activeCount });
            }

            for (const b of bin.books) {
              const theme = b.resourceCategory?.name || b.resource?.resourceCategory?.name || bin.theme || "General";
              if (!themeMap.has(theme)) themeMap.set(theme, { resources: [], books: [] });
              const activeCount = b.checkouts.filter((c) => !c.returnedAt).length;
              themeMap.get(theme)!.books.push({ ...b, available: b.totalCopies - activeCount });
            }

            const themeGroups = Array.from(themeMap.entries())
              .map(([theme, items]) => ({ theme, ...items }))
              .sort((a, b) => a.theme.localeCompare(b.theme));

            return (
              <div key={bin.id} className="border-2 border-emerald-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 flex items-center gap-2">
                  <h3 className="font-semibold text-emerald-800">📥 {bin.label || `Bin ${bin.number}`}</h3>
                  <span className="text-xs text-gray-400">
                    {bin.resources.length + bin.books.length} items
                  </span>
                </div>

                <div className="divide-y divide-emerald-100">
                  {themeGroups.map(({ theme, resources, books }) => {
                    const allItems = [
                      ...resources.map((r) => ({ available: r.available })),
                      ...books.map((b) => ({ available: b.available })),
                    ];
                    const themeAvailable = allItems.every((i) => i.available > 0);

                    return (
                      <div key={theme} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-medium">
                              🎨 {theme}
                            </span>
                            <span className="text-xs text-gray-400">
                              {allItems.length} item{allItems.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <button
                            disabled={!themeAvailable}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            ✅ Check Out Theme
                          </button>
                        </div>

                        <div className="grid gap-2">
                          {resources.map((r) => (
                            <div key={`r-${r.id}`} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{r.name}</p>
                                {r.description && <p className="text-xs text-gray-500 truncate">{r.description}</p>}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                r.available > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {r.available}/{r.quantity}
                              </span>
                            </div>
                          ))}
                          {books.map((b) => (
                            <Link key={`b-${b.id}`} href={`/books/${b.id}`} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                  {b.coverImageUrl ? (
                                    <img src={b.coverImageUrl} alt={b.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-sm">📕</div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 text-sm truncate">{b.title}</p>
                                  <p className="text-xs text-gray-500">{b.author}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">📕 Book</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  b.available > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}>
                                  {b.available}/{b.totalCopies}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {themeGroups.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">No items in this bin yet.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {shelf.sections.length === 0 && shelf.bins.length === 0 && (
        <p className="text-gray-500">No sections or bins configured for this shelf.</p>
      )}
    </div>
  );
}
