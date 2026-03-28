"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  sections: DetailSection[];
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
    return { bg: "bg-emerald-100", border: "border-emerald-500", text: "text-emerald-800" };
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
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null);
  const [shelfDetail, setShelfDetail] = useState<ShelfDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fixtures, setFixtures] = useState<RoomFixture[]>([]);

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
          const totalResources = shelf.bins?.reduce((sum, b) => sum + (b._count?.resources || 0), 0) || 0;

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
                  ? `${shelf.bins?.length || 0} bins · ${totalResources} items`
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
          <div className="w-3 h-3 bg-emerald-100 border border-emerald-500 rounded" />
          Resource shelf
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
          ) : selectedShelf.type === "resource" ? (
            <div className="divide-y">
              {selectedShelf.bins && selectedShelf.bins.length > 0 ? (
                selectedShelf.bins.map((bin) => (
                  <div key={bin.id} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-800">
                        📥 {bin.label || `Bin ${bin.number}`}
                      </span>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        {bin._count.resources} resources
                      </span>
                      {bin._count.books > 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          {bin._count.books} books
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/resources?binId=${bin.id}`}
                      className="text-sm text-emerald-600 hover:underline"
                    >
                      View resources →
                    </Link>
                  </div>
                ))
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
                          <Link
                            key={book.id}
                            href={`/books/${book.id}`}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
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
                            <div className="flex-shrink-0 text-right">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                available > 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {available}/{book.totalCopies}
                              </span>

                              {activeCheckouts.length > 0 && (
                                <div className="mt-1">
                                  {activeCheckouts.map((co) => (
                                    <div key={co.id} className="text-[10px] text-gray-400">
                                      {co.teacher.name} · {new Date(co.checkedOutAt).toLocaleDateString()}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
