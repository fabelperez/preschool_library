"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";

interface Teacher {
  id: string;
  name: string;
}

export default function SubmitBookPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // Book fields
  const [isbn, setIsbn] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [totalCopies, setTotalCopies] = useState(1);
  const [notes, setNotes] = useState("");

  const [scanned, setScanned] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Title search state
  const [titleQuery, setTitleQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    title: string;
    author: string;
    coverImageUrl: string | null;
    isbn: string | null;
    firstPublishYear: number | null;
  }[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => r.json())
      .then(setTeachers)
      .catch(console.error);
  }, []);

  const handleScan = async (scannedIsbn: string) => {
    setIsbn(scannedIsbn);
    setLookupLoading(true);

    try {
      const res = await fetch(`/api/books/lookup?isbn=${scannedIsbn}`);
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || "");
        setAuthor(data.author || "");
        setCoverImageUrl(data.coverImageUrl || "");
      }
    } catch {
      // Manual entry fallback
    } finally {
      setLookupLoading(false);
      setScanned(true);
    }
  };

  const handleTitleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);

    try {
      const res = await fetch(`/api/books/lookup?q=${encodeURIComponent(titleQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      // Search failed silently
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: {
    title: string;
    author: string;
    coverImageUrl: string | null;
    isbn: string | null;
  }) => {
    setTitle(result.title);
    setAuthor(result.author);
    setCoverImageUrl(result.coverImageUrl || "");
    setIsbn(result.isbn || "");
    setSearchResults([]);
    setTitleQuery("");
    setScanned(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !selectedTeacherId) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/library-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isbn: isbn || null,
          title,
          author,
          coverImageUrl: coverImageUrl || null,
          totalCopies,
          notes: notes || null,
          teacherId: selectedTeacherId,
        }),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: `"${title}" has been submitted for review! The librarian will be notified.`,
        });
        // Reset form
        setIsbn("");
        setTitle("");
        setAuthor("");
        setCoverImageUrl("");
        setTotalCopies(1);
        setNotes("");
        setScanned(false);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Submission failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">📥 Submit a Book</h1>
      <p className="text-gray-600">
        Found a book you think should be in the library? Submit it here and the librarian will review it.
      </p>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
          {message.type === "success" && (
            <div className="mt-2">
              <button
                onClick={() => setMessage(null)}
                className="text-sm text-green-600 hover:underline mr-4"
              >
                Submit another
              </button>
              <button
                onClick={() => router.push("/books")}
                className="text-sm text-green-600 hover:underline"
              >
                Browse books →
              </button>
            </div>
          )}
        </div>
      )}

      {!message?.type && (
        <>
          {/* Step 1: Who are you */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
            <h2 className="font-semibold text-indigo-800 mb-3">Step 1: Who are you?</h2>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select your name...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Scan or enter book */}
          {selectedTeacherId && !scanned && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-blue-800 mb-3">Step 2: Find Your Book</h2>

              {/* Title search */}
              <div>
                <h3 className="text-sm font-medium text-blue-700 mb-2">🔍 Search by title or author</h3>
                <form onSubmit={handleTitleSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={titleQuery}
                    onChange={(e) => setTitleQuery(e.target.value)}
                    placeholder="e.g., The Very Hungry Caterpillar"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={searching || !titleQuery.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {searching ? "Searching..." : "Search"}
                  </button>
                </form>

                {/* Search results */}
                {searching && (
                  <p className="text-sm text-blue-600 mt-2">Searching Open Library...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
                    <p className="text-xs text-gray-500">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} — tap to select</p>
                    {searchResults.map((result, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectResult(result)}
                        className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all flex gap-3"
                      >
                        <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center text-lg shrink-0 overflow-hidden">
                          {result.coverImageUrl ? (
                            <img src={result.coverImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            "📕"
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm truncate">{result.title}</p>
                          <p className="text-xs text-gray-500">{result.author}</p>
                          <div className="flex gap-2 mt-0.5">
                            {result.firstPublishYear && (
                              <span className="text-xs text-gray-400">{result.firstPublishYear}</span>
                            )}
                            {result.isbn && (
                              <span className="text-xs text-gray-400">ISBN: {result.isbn}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {!searching && searchResults.length === 0 && titleQuery && (
                  <p className="text-xs text-gray-400 mt-2">No results yet — press Search to look up books</p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-blue-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-blue-50 px-3 text-blue-500 font-medium">OR</span>
                </div>
              </div>

              {/* Barcode scanner */}
              <div>
                <h3 className="text-sm font-medium text-blue-700 mb-2">📷 Scan barcode / enter ISBN</h3>
                <BarcodeScanner onScan={handleScan} />
                {lookupLoading && (
                  <p className="text-sm text-blue-600 mt-3">Looking up book...</p>
                )}
              </div>

              <div className="pt-2 border-t border-blue-200">
                <button
                  onClick={() => setScanned(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Skip — enter details manually →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm details and submit */}
          {selectedTeacherId && scanned && (
            <form onSubmit={handleSubmit} className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-green-800 mb-1">Step 3: Confirm Details</h2>
              <p className="text-sm text-green-700 mb-3">Fill in or correct any book information, then submit.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                <input
                  type="text"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 9780399226908"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Copies</label>
                <input
                  type="number"
                  value={totalCopies}
                  onChange={(e) => setTotalCopies(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes for the Librarian</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Found this at a book fair, great for science unit..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScanned(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  ← Back to scan
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title || !author}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit for Review"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
