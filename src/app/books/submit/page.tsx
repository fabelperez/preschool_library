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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !selectedTeacherId) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/submissions", {
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h2 className="font-semibold text-blue-800 mb-3">Step 2: Scan or Enter Book Info</h2>
              <BarcodeScanner onScan={handleScan} />
              {lookupLoading && (
                <p className="text-sm text-blue-600 mt-3">Looking up book...</p>
              )}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <button
                  onClick={() => setScanned(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Skip scanning — enter details manually →
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
