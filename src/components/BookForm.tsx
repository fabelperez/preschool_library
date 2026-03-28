"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
}

interface BookFormProps {
  initialData?: {
    isbn?: string;
    title: string;
    author: string;
    coverImageUrl?: string | null;
    totalCopies: number;
    categoryId?: string | null;
  };
  onSubmit: (data: {
    isbn: string;
    title: string;
    author: string;
    coverImageUrl: string;
    totalCopies: number;
    categoryId: string;
  }) => Promise<void>;
  submitLabel?: string;
}

export default function BookForm({ initialData, onSubmit, submitLabel = "Save Book" }: BookFormProps) {
  const [isbn, setIsbn] = useState(initialData?.isbn || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [author, setAuthor] = useState(initialData?.author || "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || "");
  const [totalCopies, setTotalCopies] = useState(initialData?.totalCopies || 1);
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/shelves")
      .then((r) => r.json())
      .then((shelves) => {
        // Extract unique categories from shelves
        const cats = new Map<string, string>();
        for (const shelf of shelves) {
          for (const section of shelf.sections) {
            if (section.category) {
              cats.set(section.category.id, section.category.name);
            }
          }
        }
        // Also fetch any categories not assigned to shelves
        return fetch("/api/books").then((r) => r.json()).then((books: { category?: { id: string; name: string } }[]) => {
          for (const book of books) {
            if (book.category) {
              cats.set(book.category.id, book.category.name);
            }
          }
          setCategories(
            Array.from(cats.entries())
              .map(([id, name]) => ({ id, name }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        });
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit({ isbn, title, author, coverImageUrl: coverImageUrl || "", totalCopies, categoryId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
        <input
          type="text"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
        <input
          type="url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Copies</label>
        <input
          type="number"
          value={totalCopies}
          onChange={(e) => setTotalCopies(parseInt(e.target.value) || 1)}
          min={1}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
