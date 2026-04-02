"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { groupByTheme } from "@/lib/groupByTheme";
import { useRole } from "@/components/RoleProvider";

interface ShelfSection {
  id: string;
  label: string | null;
  category: { id: string; name: string };
  bookCount: number;
  availableCount: number;
}

interface RoomFixture {
  id: string;
  type: string;
  label: string;
  emoji: string;
  layoutX: number;
  layoutY: number;
  layoutWidth: number;
  layoutHeight: number;
  layoutRotation: number;
  borderStyle: string;
  bgColor: string;
}

interface Shelf {
  id: string;
  name: string;
  type: string;
  position: number;
  layoutX: number;
  layoutY: number;
  layoutWidth: number;
  layoutHeight: number;
  layoutRotation: number;
  sections: ShelfSection[];
  bins: { id: string; number: number; label: string | null; _count: { resources: number; books: number } }[];
  resourceCount: number;
  availableResourceCount: number;
}

interface DetailBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  totalCopies: number;
  checkouts: {
    id: string;
    returnedAt: string | null;
    checkedOutAt: string;
    teacher: { name: string };
  }[];
}

interface DetailSection {
  id: string;
  label: string | null;
  category: {
    id: string;
    name: string;
    books: DetailBook[];
  };
}

interface ShelfDetail {
  id: string;
  name: string;
  type?: string;
  sections: DetailSection[];
  bins?: DetailBin[];
}

interface DetailResource {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  resourceCategory: { id: string; name: string } | null;
  checkouts: { id: string; returnedAt: string | null }[];
}

interface DetailBinBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  totalCopies: number;
  checkouts: { id: string; returnedAt: string | null }[];
  resource?: {
    resourceCategory?: { id: string; name: string } | null;
  } | null;
}

interface DetailBin {
  id: string;
  number: number;
  label: string | null;
  resources: DetailResource[];
  books: DetailBinBook[];
}

// Fallback positions when shelves have no stored layout (all zeros)
const FALLBACK_LAYOUTS: Record<number, { top: string; left: string; width: string; height: string; rotate?: string }> = {
  1: { top: "8%", left: "5%", width: "40%", height: "14%" },
  2: { top: "8%", left: "55%", width: "40%", height: "14%" },
  3: { top: "38%", left: "5%", width: "25%", height: "14%" },
  4: { top: "38%", left: "70%", width: "25%", height: "14%" },
  5: { top: "65%", left: "15%", width: "30%", height: "14%" },
  6: { top: "65%", left: "55%", width: "30%", height: "14%" },
};

function hasDbLayout(shelf: Shelf) {
  return shelf.layoutWidth > 0 && shelf.layoutHeight > 0;
}

function getShelfStyle(shelf: Shelf, index: number) {
  if (hasDbLayout(shelf)) {
    return {
      top: `${shelf.layoutY}%`,
      left: `${shelf.layoutX}%`,
      width: `${shelf.layoutWidth}%`,
      height: `${shelf.layoutHeight}%`,
      rotate: shelf.layoutRotation !== 0 ? `rotate(${shelf.layoutRotation}deg)` : undefined,
    };
  }
  // Fallback for shelves without saved positions
  const layout = FALLBACK_LAYOUTS[index + 1] || {
    top: `${20 + (index % 3) * 30}%`,
    left: `${5 + Math.floor(index / 3) * 35}%`,
    width: "25%",
    height: "14%",
  };
  return layout;
}

function getAvailabilityColor(shelf: Shelf) {
  if (shelf.type === "resource") {
    const total = shelf.resourceCount || 0;
    const available = shelf.availableResourceCount || 0;
    if (total === 0) return { bg: "bg-gray-200", border: "border-gray-400", text: "text-gray-600" };
    if (available === total) return { bg: "bg-green-100", border: "border-green-500", text: "text-green-800" };
    if (available === 0) return { bg: "bg-red-100", border: "border-red-500", text: "text-red-800" };
    return { bg: "bg-amber-100", border: "border-amber-500", text: "text-amber-800" };
  }

  const sections = shelf.sections;
  const totalBooks = sections.reduce((sum, s) => sum + s.bookCount, 0);
  const totalAvailable = sections.reduce((sum, s) => sum + s.availableCount, 0);

  if (totalBooks === 0) return { bg: "bg-gray-200", border: "border-gray-400", text: "text-gray-600" };
  if (totalAvailable === totalBooks) return { bg: "bg-green-100", border: "border-green-500", text: "text-green-800" };
  if (totalAvailable === 0) return { bg: "bg-red-100", border: "border-red-500", text: "text-red-800" };
  return { bg: "bg-amber-100", border: "border-amber-500", text: "text-amber-800" };
}

export default function LibraryRoomView({ shelves }: { shelves: Shelf[] }) {
  const { teacherId, teacherName } = useRole();
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [shelfDetail, setShelfDetail] = useState<ShelfDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fixtures, setFixtures] = useState<RoomFixture[]>([]);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/room-fixtures")
      .then((r) => r.json())
      .then(setFixtures)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedShelf) {
      setShelfDetail(null);
      return;
    }

    setDetailLoading(true);
    fetch(`/api/shelves/${selectedShelf.id}`)
      .then((r) => r.json())
      .then(setShelfDetail)
      .catch(console.error)
      .finally(() => setDetailLoading(false));
  }, [selectedShelf]);

  const refreshDetail = useCallback(() => {
    if (!selectedShelf) return;
    fetch(`/api/shelves/${selectedShelf.id}`)
      .then((r) => r.json())
      .then(setShelfDetail)
      .catch(console.error);
  }, [selectedShelf]);

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
        refreshDetail();
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

  return (
    <div className="space-y-4">
      {/* Room view */}
      <div className="relative bg-gradient-to-b from-sky-50 to-amber-50 border-2 border-stone-400 rounded-2xl overflow-hidden"
           style={{ paddingBottom: "55%" }}>
        {/* Room decorations */}
        <div className="absolute bottom-0 left-0 right-0 h-[8%] bg-amber-800/20 border-t border-amber-900/30" />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-stone-400 font-medium tracking-wider uppercase">
          Library Room
        </div>

        {/* Room fixtures from database */}
        {fixtures.map((fixture) => {
          const isRound = fixture.type === "rug";
          return (
            <div
              key={fixture.id}
              className={`absolute flex items-center justify-center pointer-events-none
                ${isRound ? "rounded-full" : "rounded-lg"}
                ${fixture.bgColor}
                border-2 ${fixture.borderStyle === "dashed" ? "border-dashed" : "border-solid"}
                border-gray-300/60`}
              style={{
                top: `${fixture.layoutY}%`,
                left: `${fixture.layoutX}%`,
                width: `${fixture.layoutWidth}%`,
                height: `${fixture.layoutHeight}%`,
                transform: fixture.layoutRotation ? `rotate(${fixture.layoutRotation}deg)` : undefined,
              }}
            >
              <div className="text-center">
                <span className="text-lg">{fixture.emoji}</span>
                <div className="text-[9px] text-gray-500 leading-tight">{fixture.label}</div>
              </div>
            </div>
          );
        })}

        {/* Shelves */}
        {shelves.map((shelf, index) => {
          const style = getShelfStyle(shelf, index);
          const colors = getAvailabilityColor(shelf);
          const isSelected = selectedShelf?.id === shelf.id;
          const isResource = shelf.type === "resource";
          const totalBooks = shelf.sections.reduce((sum, s) => sum + s.bookCount, 0);
          const totalAvailable = shelf.sections.reduce((sum, s) => sum + s.availableCount, 0);

          return (
            <button
              key={shelf.id}
              onClick={() => setSelectedShelf(isSelected ? null : shelf)}
              className={`absolute ${colors.bg} border-2 ${isSelected ? "border-indigo-600 ring-2 ring-indigo-300" : colors.border} 
                rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer
                flex flex-col items-center justify-center p-1 group`}
              style={{
                top: style.top,
                left: style.left,
                width: style.width,
                height: style.height,
                transform: style.rotate,
              }}
            >
              {/* Shelf visual - horizontal lines to look like shelf rows */}
              <div className="absolute inset-x-2 top-[30%] border-t border-current opacity-10" />
              <div className="absolute inset-x-2 top-[60%] border-t border-current opacity-10" />

              <span className={`font-bold text-xs md:text-sm ${colors.text} truncate w-full text-center leading-tight`}>
                {shelf.name}
              </span>
              <span className={`text-[10px] md:text-xs ${colors.text} opacity-75 mt-0.5`}>
                {isResource
                  ? `${shelf.availableResourceCount ?? 0}/${shelf.resourceCount ?? 0} available`
                  : `${totalAvailable}/${totalBooks} available`
                }
              </span>

              {/* Hover tooltip */}
              <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {isResource ? "Click to view resources" : "Click to view books"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs text-gray-500 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 border border-green-500 rounded" />
          All available
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-100 border border-amber-500 rounded" />
          Some checked out
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 border border-red-500 rounded" />
          All checked out
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-200 border border-gray-400 rounded" />
          Empty
        </div>
      </div>

      {/* Detail panel */}
      {selectedShelf && (
        <div className={`border-2 ${selectedShelf.type === "resource" ? "border-emerald-200" : "border-indigo-200"} rounded-xl bg-white shadow-lg overflow-hidden animate-in`}>
          <div className={`${selectedShelf.type === "resource" ? "bg-emerald-600" : "bg-indigo-600"} text-white px-5 py-3 flex justify-between items-center`}>
            <h3 className="font-bold text-lg">{selectedShelf.type === "resource" ? "📦" : "🗄️"} {selectedShelf.name}</h3>
            <div className="flex items-center gap-3">
              <Link
                href={selectedShelf.type === "resource" ? `/resources?shelfId=${selectedShelf.id}` : `/shelves/${selectedShelf.id}`}
                className={`text-sm ${selectedShelf.type === "resource" ? "text-emerald-200 hover:text-white" : "text-indigo-200 hover:text-white"} underline`}
              >
                Full page →
              </Link>
              <button
                onClick={() => setSelectedShelf(null)}
                className="text-indigo-200 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="p-8 text-center text-gray-500">Loading shelf details...</div>
          ) : <>
            {/* Checkout feedback */}
            {checkoutMessage && (
              <div className={`mx-4 mt-3 p-3 rounded-lg text-sm font-medium ${
                checkoutMessage.type === "success"
                  ? "bg-green-100 text-green-800"
                  : checkoutMessage.type === "warning"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {checkoutMessage.text}
                <button onClick={() => setCheckoutMessage(null)} className="ml-2 underline text-xs">dismiss</button>
              </div>
            )}
          {selectedShelf.type === "resource" && shelfDetail?.bins ? (
            <div className="divide-y">
              {shelfDetail.bins.length > 0 ? (
                shelfDetail.bins.map((bin) => {
                  const themes = groupByTheme(bin.resources, bin.books);
                  return (
                    <div key={bin.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">
                            📥 {bin.label || `Bin ${bin.number}`}
                          </span>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            {bin.resources.length} resources
                          </span>
                          {bin.books.length > 0 && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                              {bin.books.length} books
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/resources?binId=${bin.id}`}
                          className="text-sm text-emerald-600 hover:underline"
                        >
                          View all →
                        </Link>
                      </div>

                      {themes.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Empty bin</p>
                      ) : (
                        <div className="space-y-3">
                          {themes.map((theme) => (
                            <div key={theme.themeName} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    🎨 {theme.themeName}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {theme.resources.length + theme.books.length} items
                                  </span>
                                </div>
                                {(() => {
                                  const allAvailable = [
                                    ...theme.resources.map((r) => r.quantity - (r.checkouts?.filter((c) => !c.returnedAt).length || 0)),
                                    ...theme.books.map((b) => (b.totalCopies || 1) - (b.checkouts?.filter((c: { returnedAt: string | null }) => !c.returnedAt).length || 0)),
                                  ];
                                  const themeAvailable = allAvailable.every((a) => a > 0);
                                  return (
                                    <button
                                      disabled={!themeAvailable}
                                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                      ✅ Check Out Theme
                                    </button>
                                  );
                                })()}
                              </div>
                              <div className="space-y-1">
                                {theme.resources.map((r) => {
                                  const available = r.quantity - (r.checkouts?.filter((c) => !c.returnedAt).length || 0);
                                  return (
                                    <Link
                                      key={r.id}
                                      href={`/resources/${r.id}`}
                                      className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-white transition-colors"
                                    >
                                      <span>🧩 {r.name}</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        available > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                      }`}>
                                        {available}/{r.quantity}
                                      </span>
                                    </Link>
                                  );
                                })}
                                {theme.books.map((b) => {
                                  const activeCheckouts = b.checkouts?.filter((c: { returnedAt: string | null }) => !c.returnedAt).length || 0;
                                  const available = (b.totalCopies || 1) - activeCheckouts;
                                  return (
                                    <Link
                                      key={b.id}
                                      href={`/books/${b.id}`}
                                      className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-white transition-colors"
                                    >
                                      <span>📖 {b.title}</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        available > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                      }`}>
                                        {available}/{b.totalCopies || 1}
                                      </span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-sm text-gray-400 italic">No bins on this shelf yet</div>
              )}
            </div>
          ) : shelfDetail ? (
            <div className="divide-y">
              {shelfDetail.sections.map((section) => (
                <div key={section.id} className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-semibold text-gray-800">
                      {section.label || section.category.name}
                    </span>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      {section.category.name}
                    </span>
                  </div>

                  {section.category.books.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No books in this section</p>
                  ) : (
                    <div className="grid gap-2">
                      {section.category.books.map((book) => {
                        const activeCheckouts = book.checkouts.filter((c) => !c.returnedAt);
                        const available = book.totalCopies - activeCheckouts.length;

                        return (
                          <div key={book.id} className="flex items-center gap-2">
                            <Link
                              href={`/books/${book.id}`}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors flex-1 min-w-0"
                            >
                              {/* Mini cover */}
                              <div className="w-8 h-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                {book.coverImageUrl ? (
                                  <img src={book.coverImageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm">📕</div>
                                )}
                              </div>

                              {/* Book info */}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate">{book.title}</div>
                                <div className="text-xs text-gray-500">{book.author}</div>
                              </div>

                              {/* Availability */}
                              <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${
                                available > 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {available}/{book.totalCopies}
                              </span>
                            </Link>
                            <button
                              onClick={() => handleBookCheckout(book.id, book.title)}
                              disabled={available <= 0 || checkoutLoadingId === book.id}
                              className="flex-shrink-0 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                            >
                              {checkoutLoadingId === book.id ? (
                                <>
                                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                  Checking out…
                                </>
                              ) : (
                                "✅ Check Out"
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
          </>}
        </div>
      )}
    </div>
  );
}
