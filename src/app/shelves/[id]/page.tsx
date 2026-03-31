"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BookCard from "@/components/BookCard";

interface Book {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  totalCopies: number;
  checkouts: { returnedAt: string | null; teacher: { name: string }; checkedOutAt: string }[];
}

interface Section {
  id: string;
  label: string | null;
  category: { id: string; name: string; books: Book[] };
}

interface Shelf {
  id: string;
  name: string;
  sections: Section[];
}

export default function ShelfDetailPage() {
  const params = useParams();
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/shelves/${params.id}`)
      .then((r) => r.json())
      .then(setShelf)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading shelf...</div>;
  if (!shelf) return <div className="text-center py-12 text-red-500">Shelf not found</div>;

  return (
    <div className="space-y-6">
      <Link href="/library" className="text-indigo-600 hover:underline text-sm">← Back to library</Link>

      <h1 className="text-2xl font-bold text-gray-900">🗄️ {shelf.name}</h1>

      {shelf.sections.length === 0 ? (
        <p className="text-gray-500">No sections configured for this shelf.</p>
      ) : (
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
                      return (
                        <BookCard
                          key={book.id}
                          id={book.id}
                          title={book.title}
                          author={book.author}
                          coverImageUrl={book.coverImageUrl}
                          categoryName={section.category.name}
                          totalCopies={book.totalCopies}
                          availableCopies={book.totalCopies - activeCheckouts.length}
                          checkedOutBy={activeCheckouts.map((c) => ({
                            teacherName: c.teacher.name,
                            checkedOutAt: c.checkedOutAt,
                          }))}
                          shelfLocation={shelf.name}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
