"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
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
  position: number;
  sections: ShelfSection[];
}

export default function Home() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="max-w-xl mx-auto">
          <SearchBar />
        </div>
      </div>

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
