"use client";

import { useState } from "react";

type OpenLibraryBook = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
};

export default function RequestBookPage() {
  const [roomColor, setRoomColor] = useState("Blue");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<OpenLibraryBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    if (!search.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(search)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search Open Library");
      }

      const data = await response.json();

      console.log("OPEN LIBRARY RESPONSE:", data);

      setResults(data.docs?.slice(0, 10) || []);
    } catch (err) {
      console.error("OPEN LIBRARY ERROR:", err);
      setError("Unable to search Open Library.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest(book: OpenLibraryBook) {
    try {
      const response = await fetch("/api/library-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestText: book.title,
          roomColor,
          requestedBy: roomColor,
          email: "",
        }),
      });

      const data = await response.json();

      console.log("REQUEST RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed request");
      }

      alert(`Submitted "${book.title}" successfully!`);
    } catch (err) {
      console.error("REQUEST ERROR:", err);
      alert("Failed to submit request.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-4xl font-bold">📚 Submit a Book</h1>

      <div className="space-y-2">
        <label className="font-semibold">Who are you?</label>

        <select
          className="border rounded px-3 py-2 w-full"
          value={roomColor}
          onChange={(e) => setRoomColor(e.target.value)}
        >
          <option>Blue</option>
          <option>Red</option>
          <option>Green</option>
          <option>Yellow</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="font-semibold">
          Search by title or author
        </label>

        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="The Rainbow Fish"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {results.map((book) => (
          <div
            key={book.key}
            className="border rounded p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-bold text-lg">
                {book.title}
              </div>

              <div className="text-sm text-gray-600">
                {book.author_name?.join(", ") || "Unknown Author"}
              </div>

              {book.first_publish_year && (
                <div className="text-xs text-gray-500">
                  Published: {book.first_publish_year}
                </div>
              )}
            </div>

            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => submitRequest(book)}
            >
              Request
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}