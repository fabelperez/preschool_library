"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import BookCard from "@/components/BookCard";
import ResourceCard from "@/components/ResourceCard";
import ThemeCard, { type ActiveThemeCheckout } from "@/components/ThemeCard";

/* ---------- types ---------- */

interface Category {
  id: string;
  name: string;
  _count?: { books?: number; resources?: number };
}

interface ThemeWithStatus {
  id: string;
  name: string;
  description: string | null;
  _count: { resources: number; books: number };
  activeCheckout: ActiveThemeCheckout | null;
}

interface Teacher {
  id: string;
  name: string;
}

interface SmartResult {
  id: string;
  title: string;
  author?: string;
  isbn?: string | null;
  description?: string | null;
  availableCount?: number;
  totalCount?: number;
  matchScore: number;
  matchReasons?: string[];
}

interface BookResult {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverImageUrl: string | null;
  totalCopies: number;
  availableCopies: number;
  lostCopies: number;
  damagedCopies: number;
  resultType: "book";
  isTeacherResource: boolean;
  themeName: string | null;
  category: { id: string; name: string } | null;
  checkedOutBy: { teacherName: string; checkedOutAt: string }[];
  locationPath: string | null;
}

interface ResourceResult {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  availableQuantity: number;
  resultType: "resource";
  themeName: string | null;
  resourceCategory: { id: string; name: string } | null;
  checkedOutBy: { teacherName: string; checkedOutAt: string }[];
  locationPath: string | null;
}

type TabFilter = "all" | "books" | "resources";

/* ---------- category emoji helper ---------- */

const CATEGORY_ICONS: Record<string, string> = {
  fiction: "📖",
  "non-fiction": "🔬",
  science: "🧪",
  math: "🔢",
  art: "🎨",
  music: "🎵",
  animals: "🐾",
  nature: "🌿",
  social: "🤝",
  alphabet: "🔤",
  default: "📚",
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return CATEGORY_ICONS.default;
}

/* ---------- main content ---------- */

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQ = searchParams.get("q") || "";
  const initialCat = searchParams.get("categoryId") || "";
  const initialTab = (searchParams.get("tab") as TabFilter) || "all";

  const [query, setQuery] = useState(initialQ);
  const [categoryId, setCategoryId] = useState(initialCat);
  const [tab, setTab] = useState<TabFilter>(initialTab);

  const [books, setBooks] = useState<BookResult[]>([]);
  const [resources, setResources] = useState<ResourceResult[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [themes, setThemes] = useState<ThemeWithStatus[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* --- fetch from /api/search --- */
  const fetchResults = useCallback(
    async (q: string, catId: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (catId) params.set("categoryId", catId);
        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();
        setBooks(data.books || []);
        setResources(data.resources || []);
        setCategories(data.categories || []);
        setHasSearched(true);
      } catch (err) {
        console.error("Browse fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* --- fetch themes + teachers for theme cards --- */
  const fetchThemesAndTeachers = useCallback(async () => {
    try {
      const [themesRes, checkoutsRes, teachersRes] = await Promise.all([
        fetch("/api/resource-categories"),
        fetch("/api/checkouts"),
        fetch("/api/teachers"),
      ]);
      const [themesData, checkoutsData, teachersData] = await Promise.all([
        themesRes.json(),
        checkoutsRes.json(),
        teachersRes.json(),
      ]);

      // Build a map of resourceCategoryId → active theme checkout
      const themeCheckoutMap = new Map<string, ActiveThemeCheckout>();
      for (const co of checkoutsData) {
        if (co.type === "THEME" && co.resourceCategoryId) {
          themeCheckoutMap.set(co.resourceCategoryId, {
            id: co.id,
            teacherName: co.teacher?.name ?? "Unknown",
            checkedOutAt: co.checkedOutAt,
          });
        }
      }

      setThemes(
        themesData.map((t: ThemeWithStatus) => ({
          ...t,
          activeCheckout: themeCheckoutMap.get(t.id) ?? null,
        }))
      );
      setTeachers(teachersData.map((t: Teacher) => ({ id: t.id, name: t.name })));
    } catch (err) {
      console.error("Failed to fetch themes/teachers:", err);
    }
  }, []);

  /* initial load */
  useEffect(() => {
    fetchResults(initialQ, initialCat);
    fetchThemesAndTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* debounced search on query/category change */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query, categoryId);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (categoryId) params.set("categoryId", categoryId);
      if (tab !== "all") params.set("tab", tab);
      const qs = params.toString();
      router.replace(`/browse${qs ? `?${qs}` : ""}`, { scroll: false });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoryId]);

  /* --- filtered results --- */
  const filteredBooks = tab === "resources" ? [] : books;
  const filteredResources = tab === "books" ? [] : resources;
  const totalResults = filteredBooks.length + filteredResources.length;

  /* --- category tile click --- */
  function handleCategoryClick(id: string) {
    setCategoryId((prev) => (prev === id ? "" : id));
  }

  /* --- clear all filters --- */
  function clearFilters() {
    setQuery("");
    setCategoryId("");
    setTab("all");
    fetchResults("", "");
    router.replace("/browse", { scroll: false });
  }

  const hasFilters = query.trim() || categoryId || tab !== "all";

  return (
    <div className="space-y-6">
      {/* ---- hero header ---- */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          📚 Browse the Library
        </h1>
        <p className="text-gray-500 mt-1">
          Find books and resources for your classroom!
        </p>
      </div>

      {/* ---- search bar ---- */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 text-xl">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, ISBN, or theme…"
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-lg bg-white shadow-sm transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ---- type tabs ---- */}
      <div className="flex justify-center gap-2">
        {(
          [
            { key: "all", label: "All", icon: "🏠" },
            { key: "books", label: "Books", icon: "📕" },
            { key: "resources", label: "Resources", icon: "🧩" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ---- resource themes section ---- */}
      {themes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            🎨 Resource Themes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                id={theme.id}
                name={theme.name}
                description={theme.description}
                resourceCount={theme._count.resources}
                bookCount={theme._count.books}
                activeCheckout={theme.activeCheckout}
                teachers={teachers}
                onCheckoutChange={fetchThemesAndTeachers}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- category quick-filter tiles ---- */}
      {categories.length > 0 && tab !== "resources" && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  categoryId === cat.id
                    ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span>{getCategoryIcon(cat.name)}</span>
                {cat.name}
                {cat._count?.books != null && (
                  <span className="text-xs text-gray-400">
                    ({cat._count.books})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- active filter summary ---- */}
      {hasFilters && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>
            Showing <strong className="text-gray-900">{totalResults}</strong>{" "}
            result{totalResults !== 1 ? "s" : ""}
          </span>
          <button
            onClick={clearFilters}
            className="text-indigo-600 hover:text-indigo-800 underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* ---- loading ---- */}
      {loading && (
        <div className="text-center py-12 text-gray-400 text-lg animate-pulse">
          📖 Searching the shelves…
        </div>
      )}

      {/* ---- results ---- */}
      {!loading && (
        <div className="space-y-8">
          {/* books grid */}
          {filteredBooks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                📕 Books{" "}
                <span className="text-sm font-normal text-gray-400">
                  ({filteredBooks.length})
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    id={book.id}
                    title={book.title}
                    author={book.author}
                    coverImageUrl={book.coverImageUrl}
                    categoryName={book.category?.name}
                    totalCopies={book.totalCopies}
                    availableCopies={book.availableCopies}
                    lostCopies={book.lostCopies}
                    damagedCopies={book.damagedCopies}
                    checkedOutBy={book.checkedOutBy}
                    shelfLocation={book.locationPath || undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* resources grid */}
          {filteredResources.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                🧩 Resources{" "}
                <span className="text-sm font-normal text-gray-400">
                  ({filteredResources.length})
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    id={resource.id}
                    name={resource.name}
                    description={resource.description}
                    quantity={resource.quantity}
                    availableQuantity={resource.availableQuantity}
                    themeName={resource.themeName}
                    categoryName={resource.resourceCategory?.name}
                    locationPath={resource.locationPath}
                    checkedOutBy={resource.checkedOutBy}
                  />
                ))}
              </div>
            </div>
          )}

          {/* empty state */}
          {hasSearched && totalResults === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔭</div>
              <h3 className="text-lg font-semibold text-gray-700">
                No items found
              </h3>
              <p className="text-gray-500 mt-1">
                Try a different search or clear your filters!
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- page wrapper with Suspense ---- */

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-gray-400 animate-pulse">
          📚 Loading the library…
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
