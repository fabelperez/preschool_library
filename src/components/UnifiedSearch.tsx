"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import Fuse, { IFuseOptions } from "fuse.js";

interface Category {
  id: string;
  name: string;
}

export interface BookResult {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverImageUrl: string | null;
  totalCopies: number;
  resultType: "book";
  isTeacherResource: boolean;
  themeName: string | null;
  availableCopies: number;
  category: Category | null;
  checkedOutBy: { teacherName: string; checkedOutAt: string }[];
  locationPath: string | null;
}

interface ResourceResult {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  resultType: "resource";
  themeName: string | null;
  availableQuantity: number;
  resourceCategory: Category | null;
  checkedOutBy: { teacherName: string; checkedOutAt: string }[];
  locationPath: string | null;
}

interface SearchCounts {
  totalBooks: number;
  generalBooks: number;
  teacherResourceBooks: number;
  totalResources: number;
}

const bookFuseOptions: IFuseOptions<BookResult> = {
  keys: [
    { name: "title", weight: 0.4 },
    { name: "author", weight: 0.3 },
    { name: "isbn", weight: 0.15 },
    { name: "category.name", weight: 0.1 },
    { name: "themeName", weight: 0.05 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
};

const resourceFuseOptions: IFuseOptions<ResourceResult> = {
  keys: [
    { name: "name", weight: 0.4 },
    { name: "description", weight: 0.3 },
    { name: "resourceCategory.name", weight: 0.2 },
    { name: "themeName", weight: 0.1 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
};

export default function UnifiedSearch({ onSelectBook }: { onSelectBook?: (book: BookResult) => void } = {}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [resourceCategoryId, setResourceCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [resourceCategories, setResourceCategories] = useState<Category[]>([]);
  const [books, setBooks] = useState<BookResult[]>([]);
  const [resources, setResources] = useState<ResourceResult[]>([]);
  const [counts, setCounts] = useState<SearchCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [fuzzyEnabled, setFuzzyEnabled] = useState(true);
  const [smartSearchEnabled, setSmartSearchEnabled] = useState(false);
  const [smartSearchAvailable, setSmartSearchAvailable] = useState(false);
  const [smartRanking, setSmartRanking] = useState<{ id: string; type: string }[] | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Check if OpenAI semantic search is available on mount
  useEffect(() => {
    fetch("/api/search/semantic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "test" }) })
      .then((r) => {
        setSmartSearchAvailable(r.status !== 501);
      })
      .catch(() => setSmartSearchAvailable(false));
  }, []);

  const fetchResults = useCallback(
    async (q: string, catId: string, resCatId: string) => {
      setLoading(true);
      setSmartRanking(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (catId) params.set("categoryId", catId);
        if (resCatId) params.set("resourceCategoryId", resCatId);

        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();

        setBooks(data.books || []);
        setResources(data.resources || []);
        setCounts(data.counts || null);
        setCategories(data.categories || []);
        setResourceCategories(data.resourceCategories || []);
        setHasSearched(true);

        // If smart search is enabled and we have a text query, ask LLM to rank
        if (smartSearchEnabled && q.trim()) {
          try {
            const semanticRes = await fetch("/api/search/semantic", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: q.trim(), categoryId: catId, resourceCategoryId: resCatId }),
            });
            if (semanticRes.ok) {
              const semanticData = await semanticRes.json();
              setSmartRanking(semanticData.rankedIds || null);
            }
          } catch {
            // Smart search failed silently — fuzzy/standard results still shown
          }
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [smartSearchEnabled]
  );

  // Load categories on mount
  useEffect(() => {
    fetch("/api/search")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories || []);
        setResourceCategories(data.resourceCategories || []);
      })
      .catch(console.error);
  }, []);

  // Debounced search on filter changes
  useEffect(() => {
    if (!query && !categoryId && !resourceCategoryId) {
      setHasSearched(false);
      setBooks([]);
      setResources([]);
      setCounts(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query, categoryId, resourceCategoryId);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, categoryId, resourceCategoryId, fetchResults]);

  // Fuzzy filtering on client side, with optional smart ranking
  const filteredBooks = useMemo(() => {
    let result = books;
    if (fuzzyEnabled && query.trim() && books.length > 0) {
      const fuse = new Fuse(books, bookFuseOptions);
      result = fuse.search(query.trim()).map((r) => r.item);
    }
    // Apply LLM ranking if available
    if (smartRanking && smartRanking.length > 0) {
      const bookRankMap = new Map<string, number>();
      smartRanking
        .filter((r) => r.type === "book")
        .forEach((r, i) => bookRankMap.set(r.id, i));
      const ranked = result.filter((b) => bookRankMap.has(b.id));
      const unranked = result.filter((b) => !bookRankMap.has(b.id));
      ranked.sort((a, b) => (bookRankMap.get(a.id) ?? 0) - (bookRankMap.get(b.id) ?? 0));
      result = [...ranked, ...unranked];
    }
    return result;
  }, [books, query, fuzzyEnabled, smartRanking]);

  const filteredResources = useMemo(() => {
    let result = resources;
    if (fuzzyEnabled && query.trim() && resources.length > 0) {
      const fuse = new Fuse(resources, resourceFuseOptions);
      result = fuse.search(query.trim()).map((r) => r.item);
    }
    if (smartRanking && smartRanking.length > 0) {
      const resRankMap = new Map<string, number>();
      smartRanking
        .filter((r) => r.type === "resource")
        .forEach((r, i) => resRankMap.set(r.id, i));
      const ranked = result.filter((r) => resRankMap.has(r.id));
      const unranked = result.filter((r) => !resRankMap.has(r.id));
      ranked.sort((a, b) => (resRankMap.get(a.id) ?? 0) - (resRankMap.get(b.id) ?? 0));
      result = [...ranked, ...unranked];
    }
    return result;
  }, [resources, query, fuzzyEnabled, smartRanking]);

  const generalBooks = filteredBooks.filter((b) => !b.isTeacherResource);
  const teacherResourceBooks = filteredBooks.filter((b) => b.isTeacherResource);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResults(query, categoryId, resourceCategoryId);
  };

  return (
    <div className="space-y-4">
      {/* Search bar + filters */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books and resources..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Search
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                📖 {cat.name}
              </option>
            ))}
          </select>

          <select
            value={resourceCategoryId}
            onChange={(e) => setResourceCategoryId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Themes</option>
            {resourceCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                🎨 {cat.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-sm text-gray-600 ml-auto">
            <input
              type="checkbox"
              checked={fuzzyEnabled}
              onChange={(e) => setFuzzyEnabled(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Fuzzy match
          </label>

          {smartSearchAvailable && (
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={smartSearchEnabled}
                onChange={(e) => setSmartSearchEnabled(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              ✨ Smart search
            </label>
          )}

          {(query || categoryId || resourceCategoryId) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategoryId("");
                setResourceCategoryId("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          )}
        </div>
      </form>

      {/* Results */}
      {loading && (
        <div className="text-center py-6 text-gray-500">Searching...</div>
      )}

      {hasSearched && !loading && (
        <div className="space-y-6">
          {/* Summary counts */}
          <div className="flex flex-wrap gap-3 text-sm">
            {counts && (
              <>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                  📖 {counts.generalBooks} book{counts.generalBooks !== 1 ? "s" : ""}
                </span>
                <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
                  📚 {counts.teacherResourceBooks} teacher resource book{counts.teacherResourceBooks !== 1 ? "s" : ""}
                </span>
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">
                  🧩 {counts.totalResources} resource{counts.totalResources !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>

          {/* General Books */}
          {generalBooks.length > 0 && (
            <ResultSection title="📖 Books" count={generalBooks.length}>
              {generalBooks.map((book) => (
                <BookCard key={book.id} book={book} onSelect={onSelectBook} />
              ))}
            </ResultSection>
          )}

          {/* Teacher Resource Books */}
          {teacherResourceBooks.length > 0 && (
            <ResultSection
              title="📚 Teacher Resource Books"
              count={teacherResourceBooks.length}
            >
              {teacherResourceBooks.map((book) => (
                <BookCard key={book.id} book={book} onSelect={onSelectBook} />
              ))}
            </ResultSection>
          )}

          {/* Resources */}
          {filteredResources.length > 0 && (
            <ResultSection
              title="🧩 Teacher Resources"
              count={filteredResources.length}
            >
              {filteredResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </ResultSection>
          )}

          {/* No results */}
          {generalBooks.length === 0 &&
            teacherResourceBooks.length === 0 &&
            filteredResources.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg mb-2">No results found</p>
                <p className="text-sm">
                  Try adjusting your search or filters.{" "}
                  {!fuzzyEnabled && (
                    <button
                      onClick={() => setFuzzyEnabled(true)}
                      className="text-indigo-600 hover:underline"
                    >
                      Enable fuzzy matching
                    </button>
                  )}
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function ResultSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        {title}{" "}
        <span className="text-sm font-normal text-gray-500">({count})</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </div>
  );
}

function BookCard({ book, onSelect }: { book: BookResult; onSelect?: (book: BookResult) => void }) {
  const available = book.availableCopies > 0;
  const cardClass = "block w-full text-left p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all bg-white";
  const content = (
    <div className="flex gap-3">
      <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center text-lg shrink-0">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt=""
            className="w-full h-full object-cover rounded"
          />
        ) : (
          "📕"
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 text-sm truncate">
          {book.title}
        </p>
        <p className="text-xs text-gray-500 truncate">{book.author}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {book.category && (
            <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
              {book.category.name}
            </span>
          )}
          {book.themeName && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">
              🎨 {book.themeName}
            </span>
          )}
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              available
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {book.availableCopies}/{book.totalCopies}
          </span>
          {book.locationPath && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
              📍 {book.locationPath}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(book)} className={cardClass}>
        {content}
      </button>
    );
  }

  return (
    <Link href={`/books/${book.id}`} className={cardClass}>
      {content}
    </Link>
  );
}

function ResourceCard({ resource }: { resource: ResourceResult }) {
  const available = resource.availableQuantity > 0;
  return (
    <Link
      href={`/resources/${resource.id}`}
      className="block p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all bg-white"
    >
      <div className="min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">
          {resource.name}
        </p>
        {resource.description && (
          <p className="text-xs text-gray-500 truncate">
            {resource.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {resource.themeName && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">
              🎨 {resource.themeName}
            </span>
          )}
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              available
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {resource.availableQuantity}/{resource.quantity}
          </span>
          {resource.locationPath && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
              📍 {resource.locationPath}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
