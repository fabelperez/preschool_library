"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import BookForm from "@/components/BookForm";

export default function AddBookPage() {
  const router = useRouter();
  const [lookupResult, setLookupResult] = useState<{
    isbn: string;
    title: string;
    author: string;
    coverImageUrl: string | null;
  } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleScan = async (isbn: string) => {
    setLookupLoading(true);
    setLookupError(null);

    try {
      const res = await fetch(`/api/books/lookup?isbn=${isbn}`);
      if (res.ok) {
        const data = await res.json();
        setLookupResult(data);
      } else {
        setLookupError(`ISBN ${isbn} not found in Open Library. You can enter the details manually.`);
        setLookupResult({ isbn, title: "", author: "", coverImageUrl: null });
      }
    } catch {
      setLookupError("Failed to look up ISBN. Enter details manually.");
      setLookupResult({ isbn, title: "", author: "", coverImageUrl: null });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (data: {
    isbn: string;
    title: string;
    author: string;
    coverImageUrl: string;
    totalCopies: number;
    categoryId: string;
    resourceCategoryId: string;
  }) => {
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add book");
    }

    const book = await res.json();
    router.push(`/books/${book.id}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">➕ Add New Book</h1>

      {!lookupResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h2 className="font-semibold text-blue-800 mb-3">Step 1: Scan or Enter ISBN</h2>
          <BarcodeScanner onScan={handleScan} />
          {lookupLoading && (
            <p className="text-sm text-blue-600 mt-3">Looking up book information...</p>
          )}
          {lookupError && (
            <p className="text-sm text-orange-600 mt-3">{lookupError}</p>
          )}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <button
              onClick={() => setLookupResult({ isbn: "", title: "", author: "", coverImageUrl: null })}
              className="text-sm text-blue-600 hover:underline"
            >
              Skip scanning — enter details manually →
            </button>
          </div>
        </div>
      )}

      {lookupResult && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-semibold text-gray-800">Step 2: Confirm & Save</h2>
            <button
              onClick={() => { setLookupResult(null); setLookupError(null); }}
              className="text-sm text-indigo-600 hover:underline"
            >
              ← Scan another
            </button>
          </div>
          <BookForm
            initialData={{
              isbn: lookupResult.isbn,
              title: lookupResult.title,
              author: lookupResult.author,
              coverImageUrl: lookupResult.coverImageUrl,
              totalCopies: 1,
            }}
            onSubmit={handleSubmit}
            submitLabel="Add Book"
          />
        </div>
      )}
    </div>
  );
}
