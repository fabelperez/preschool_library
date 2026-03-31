"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  availableCopies: number;
  totalCopies: number;
  resourceId: string | null;
  themeCheckedOut?: boolean;
}

interface Teacher {
  id: string;
  name: string;
}

interface ResourceCategory {
  id: string;
  name: string;
}

type CheckoutMode = "book" | "theme";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const preselectedBookId = searchParams.get("bookId");
  
  const [mode, setMode] = useState<CheckoutMode>("book");
  const [books, setBooks] = useState<Book[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [themes, setThemes] = useState<ResourceCategory[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBooks = () =>
    fetch("/api/books").then((r) => r.json()).then((data) => {
      setBooks(data.filter((b: Book) => !b.resourceId));
    });

  useEffect(() => {
    Promise.all([
      fetch("/api/books").then((r) => r.json()),
      fetch("/api/teachers").then((r) => r.json()),
      fetch("/api/resource-categories").then((r) => r.json()),
    ]).then(([booksData, teachersData, themesData]) => {
      setBooks(booksData.filter((b: Book) => !b.resourceId));
      setTeachers(teachersData);
      setThemes(themesData);
      
      if (preselectedBookId) {
        const book = booksData.find((b: Book) => b.id === preselectedBookId);
        if (book) setSelectedBook(book);
      }
    });
  }, [preselectedBookId]);

  const handleScan = (isbn: string) => {
    const book = books.find((b) => b.isbn === isbn);
    if (book) {
      setSelectedBook(book);
      setMessage(null);
    } else {
      setMessage({ type: "error", text: `No book found with ISBN ${isbn}` });
    }
  };

  const handleBookCheckout = async () => {
    if (!selectedBook || !selectedTeacherId) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "BOOK", bookId: selectedBook.id, teacherId: selectedTeacherId }),
      });

      if (res.ok) {
        const teacher = teachers.find((t) => t.id === selectedTeacherId);
        setMessage({ type: "success", text: `"${selectedBook.title}" checked out to ${teacher?.name}!` });
        setSelectedBook(null);
        setSelectedTeacherId("");
        await fetchBooks();
      } else {
        const err = await res.json();
        if (res.status === 403) {
          setMessage({ type: "warning", text: err.error });
        } else {
          setMessage({ type: "error", text: err.error || "Checkout failed" });
        }
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  const handleThemeCheckout = async () => {
    if (!selectedThemeId || !selectedTeacherId) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "THEME", resourceCategoryId: selectedThemeId, teacherId: selectedTeacherId }),
      });

      if (res.ok) {
        const teacher = teachers.find((t) => t.id === selectedTeacherId);
        const theme = themes.find((t) => t.id === selectedThemeId);
        setMessage({ type: "success", text: `Theme "${theme?.name}" checked out to ${teacher?.name}!` });
        setSelectedThemeId("");
        setSelectedTeacherId("");
        await fetchBooks();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Checkout failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = searchQuery
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.author.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">✅ Check Out</h1>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode("book"); setMessage(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "book" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          📖 Individual Book
        </button>
        <button
          onClick={() => { setMode("theme"); setMessage(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "theme" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          📚 Teacher Resource Theme
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === "success" ? "bg-green-50 border border-green-200 text-green-700"
            : message.type === "warning" ? "bg-amber-50 border border-amber-200 text-amber-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {message.type === "warning" && <span className="font-semibold">⚠️ Restricted: </span>}
          {message.text}
        </div>
      )}

      {mode === "book" && (
        <>
          {/* Step 1: Select book */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h2 className="font-semibold text-blue-800 mb-3">Step 1: Find the Book</h2>
            
            <BarcodeScanner onScan={handleScan} placeholder="Scan ISBN or type to search..." />

            <div className="mt-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Or search by title/author..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && filteredBooks.length > 0 && (
                <div className="mt-2 border rounded-lg bg-white max-h-48 overflow-y-auto">
                  {filteredBooks.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => { setSelectedBook(book); setSearchQuery(""); setMessage(null); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
                      disabled={book.availableCopies <= 0}
                    >
                      <span className="font-medium">{book.title}</span>
                      <span className="text-sm text-gray-500 ml-2">by {book.author}</span>
                      {book.availableCopies <= 0 && (
                        <span className="text-xs text-red-500 ml-2">
                          {book.themeCheckedOut ? "(theme checked out)" : "(unavailable)"}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedBook && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-300">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold">{selectedBook.title}</span>
                    <span className="text-sm text-gray-500 ml-2">by {selectedBook.author}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      selectedBook.availableCopies > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {selectedBook.availableCopies}/{selectedBook.totalCopies} available
                    </span>
                  </div>
                  <button onClick={() => setSelectedBook(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Select teacher */}
          {selectedBook && selectedBook.availableCopies > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <h2 className="font-semibold text-green-800 mb-3">Step 2: Who&apos;s Checking Out?</h2>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select a teacher...</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 3: Confirm */}
          {selectedBook && selectedTeacherId && selectedBook.availableCopies > 0 && (
            <button
              onClick={handleBookCheckout}
              disabled={loading}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg disabled:opacity-50"
            >
              {loading ? "Processing..." : `Check Out "${selectedBook.title}"`}
            </button>
          )}
        </>
      )}

      {mode === "theme" && (
        <>
          {/* Step 1: Select theme */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="font-semibold text-amber-800 mb-3">Step 1: Select a Theme</h2>
            <p className="text-sm text-amber-700 mb-3">
              Checking out a theme marks all books and resources in that theme as checked out.
            </p>
            <select
              value={selectedThemeId}
              onChange={(e) => { setSelectedThemeId(e.target.value); setMessage(null); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select a theme...</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  🎨 {theme.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select teacher */}
          {selectedThemeId && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <h2 className="font-semibold text-green-800 mb-3">Step 2: Who&apos;s Checking Out?</h2>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select a teacher...</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 3: Confirm */}
          {selectedThemeId && selectedTeacherId && (
            <button
              onClick={handleThemeCheckout}
              disabled={loading}
              className="w-full px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-semibold text-lg disabled:opacity-50"
            >
              {loading ? "Processing..." : `Check Out Theme "${themes.find((t) => t.id === selectedThemeId)?.name}"`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
