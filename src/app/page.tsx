"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import UnifiedSearch from "@/components/UnifiedSearch";
import type { BookResult } from "@/components/UnifiedSearch";
import LibraryRoomView from "@/components/LibraryRoomView";

interface ShelfSection {
  id: string;
  label: string | null;
  category: { id: string; name: string };
  bookCount: number;
  availableCount: number;
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

export default function Home() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);

  useEffect(() => {
    fetch("/api/shelves")
      .then((r) => r.json())
      .then(setShelves)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-lg text-gray-500">Loading library...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">📚 Little Library</h1>
        <p className="text-gray-600">Welcome to the preschool library catalog</p>
        <div className="max-w-2xl mx-auto">
          <UnifiedSearch onSelectBook={setSelectedBook} />
        </div>
      </div>

      {selectedBook && (
        <BookPreviewCard book={selectedBook} onClear={() => setSelectedBook(null)} />
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Library Room</h2>
        <p className="text-sm text-gray-500">Click a shelf to see its books, availability, and who has them checked out.</p>
        
        {shelves.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No shelves configured yet.</p>
            <Link href="/admin/shelves" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
              Set up shelves →
            </Link>
          </div>
        ) : (
          <LibraryRoomView shelves={shelves} />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/books" className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center hover:bg-blue-100 transition-colors">
          <div className="text-2xl mb-1">📖</div>
          <div className="font-medium text-blue-800">All Books</div>
        </Link>
        <Link href="/checkout" className="p-4 bg-green-50 border border-green-200 rounded-lg text-center hover:bg-green-100 transition-colors">
          <div className="text-2xl mb-1">✅</div>
          <div className="font-medium text-green-800">Check Out</div>
        </Link>
        <Link href="/checkin" className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center hover:bg-purple-100 transition-colors">
          <div className="text-2xl mb-1">↩️</div>
          <div className="font-medium text-purple-800">Check In</div>
        </Link>
        <Link href="/books/submit" className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center hover:bg-orange-100 transition-colors">
          <div className="text-2xl mb-1">📥</div>
          <div className="font-medium text-orange-800">Submit Book</div>
        </Link>
      </div>
    </div>
  );
}

function BookPreviewCard({ book, onClear }: { book: BookResult; onClear: () => void }) {
  const available = book.availableCopies > 0;

  return (
    <div className="relative bg-white border border-indigo-200 rounded-xl shadow-md p-5 max-w-2xl mx-auto">
      <button
        onClick={onClear}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-lg leading-none"
        aria-label="Clear selection"
      >
        ✕
      </button>

      <h3 className="text-lg font-semibold text-gray-800 mb-3">📖 Book Preview</h3>

      <div className="flex gap-4">
        <div className="w-24 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-3xl shrink-0 overflow-hidden">
          {book.coverImageUrl ? (
            <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover rounded-lg" />
          ) : (
            "📕"
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h4 className="font-bold text-gray-900 text-lg leading-snug">{book.title}</h4>
            <p className="text-gray-600">by {book.author}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {book.category && (
              <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                {book.category.name}
              </span>
            )}
            {book.themeName && (
              <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-full">
                🎨 {book.themeName}
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded-full ${available ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {available ? `${book.availableCopies} available` : "Checked out"} ({book.availableCopies}/{book.totalCopies})
            </span>
          </div>

          {book.locationPath && (
            <p className="text-sm text-gray-500">📍 {book.locationPath}</p>
          )}

          {book.isbn && (
            <p className="text-xs text-gray-400">ISBN: {book.isbn}</p>
          )}

          <Link
            href={`/books/${book.id}`}
            className="inline-block mt-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View full details →
          </Link>
        </div>
      </div>
    </div>
  );
}
