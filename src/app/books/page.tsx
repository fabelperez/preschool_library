"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import BookCard from "@/components/BookCard";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverImageUrl: string | null;
  totalCopies: number;
  availableCopies: number;
  category: { id: string; name: string } | null;
  checkedOutBy: { teacherName: string; checkedOutAt: string }[];
}

function BooksContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);

    fetch(`/api/books?${params.toString()}`)
      .then((r) => r.json())
      .then(setBooks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">📖 Books</h1>
        <Link
          href="/books/add"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          + Add Book
        </Link>
      </div>

      <SearchBar />

      {query && (
        <p className="text-sm text-gray-500">
          Showing results for &ldquo;{query}&rdquo; ({books.length} found)
        </p>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading books...</div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">{query ? "No books match your search." : "No books in the library yet."}</p>
          <Link href="/books/add" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
            Add the first book →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {books.map((book) => (
            <BookCard
              key={book.id}
              id={book.id}
              title={book.title}
              author={book.author}
              coverImageUrl={book.coverImageUrl}
              categoryName={book.category?.name}
              totalCopies={book.totalCopies}
              availableCopies={book.availableCopies}
              checkedOutBy={book.checkedOutBy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading books...</div>}>
      <BooksContent />
    </Suspense>
  );
}
