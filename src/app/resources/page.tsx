"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import ResourceCard from "@/components/ResourceCard";

interface Resource {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  availableQuantity: number;
  resourceCategory: { id: string; name: string };
  bin: {
    id: string;
    number: number;
    label: string | null;
    theme: string;
    shelf: { id: string; name: string };
  };
  checkedOutBy: { teacherName: string; checkedOutAt: string }[];
}

interface TeacherBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverImageUrl: string | null;
  totalCopies: number;
  availableCopies: number;
  resourceCategory: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  bin: {
    id: string;
    number: number;
    label: string | null;
    theme: string;
    shelf: { id: string; name: string };
  } | null;
  checkedOutBy: { teacherName: string; checkedOutAt: string }[];
}

// Unified item for grouping
interface BinItem {
  id: string;
  kind: "resource" | "book";
  name: string;
  detail: string | null;
  theme: string;
  quantity: number;
  available: number;
  checkedOutBy: { teacherName: string; checkedOutAt: string }[];
  coverImageUrl?: string | null;
}

interface ResourceCategory {
  id: string;
  name: string;
}

function ResourcesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const categoryId = searchParams.get("resourceCategoryId") || "";
  const shelfId = searchParams.get("shelfId") || "";
  const binId = searchParams.get("binId") || "";
  const [resources, setResources] = useState<Resource[]>([]);
  const [teacherBooks, setTeacherBooks] = useState<TeacherBook[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/resource-categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (categoryId) params.set("resourceCategoryId", categoryId);
    if (shelfId) params.set("shelfId", shelfId);
    if (binId) params.set("binId", binId);

    fetch(`/api/resources?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        // Normalize: support { resources, teacherBooks }, plain array, or unexpected shapes
        if (Array.isArray(data)) {
          setResources(data);
          setTeacherBooks([]);
        } else if (data && typeof data === "object") {
          const r = data.resources ?? data.data ?? [];
          setResources(Array.isArray(r) ? r : []);
          const b = data.teacherBooks ?? [];
          setTeacherBooks(Array.isArray(b) ? b : []);
        } else {
          setResources([]);
          setTeacherBooks([]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query, categoryId, shelfId, binId]);

  // Group: Shelf → Bin → Theme → Items (resources + books)
  const grouped = useMemo(() => {
    const shelfMap = new Map<string, {
      shelfName: string;
      bins: Map<string, {
        binLabel: string;
        binNumber: number;
        binTheme: string;
        themes: Map<string, BinItem[]>;
      }>;
    }>();

    function ensureBin(shelfId: string, shelfName: string, binId: string, binLabel: string, binNumber: number, binTheme: string) {
      if (!shelfMap.has(shelfId)) {
        shelfMap.set(shelfId, { shelfName, bins: new Map() });
      }
      const shelf = shelfMap.get(shelfId)!;
      if (!shelf.bins.has(binId)) {
        shelf.bins.set(binId, { binLabel, binNumber, binTheme, themes: new Map() });
      }
      return shelf.bins.get(binId)!;
    }

    function addItem(bin: ReturnType<typeof ensureBin>, theme: string, item: BinItem) {
      if (!bin.themes.has(theme)) bin.themes.set(theme, []);
      bin.themes.get(theme)!.push(item);
    }

    // Add resources
    const safeResources = Array.isArray(resources) ? resources : [];
    for (const r of safeResources) {
      const sid = r.bin?.shelf?.id || "_default";
      const sname = r.bin?.shelf?.name || "Default Shelf";
      const bid = r.bin?.id || "_default";
      const blabel = r.bin?.label || "Default";
      const bnum = r.bin?.number ?? 0;
      const btheme = r.bin?.theme || "General";
      const theme = r.resourceCategory?.name || btheme;

      const bin = ensureBin(sid, sname, bid, blabel, bnum, btheme);
      addItem(bin, theme, {
        id: r.id,
        kind: "resource",
        name: r.name,
        detail: r.description,
        theme,
        quantity: r.quantity,
        available: r.availableQuantity,
        checkedOutBy: r.checkedOutBy,
      });
    }

    // Add teacher-resource books
    const safeBooks = Array.isArray(teacherBooks) ? teacherBooks : [];
    for (const b of safeBooks) {
      if (!b.bin) continue;
      const sid = b.bin.shelf?.id || "_default";
      const sname = b.bin.shelf?.name || "Default Shelf";
      const bid = b.bin.id;
      const blabel = b.bin.label || "Default";
      const bnum = b.bin.number ?? 0;
      const btheme = b.bin.theme || "General";
      const theme = b.resourceCategory?.name || btheme;

      const bin = ensureBin(sid, sname, bid, blabel, bnum, btheme);
      addItem(bin, theme, {
        id: b.id,
        kind: "book",
        name: b.title,
        detail: b.author,
        theme,
        quantity: b.totalCopies,
        available: b.availableCopies,
        checkedOutBy: b.checkedOutBy,
        coverImageUrl: b.coverImageUrl,
      });
    }

    return Array.from(shelfMap.values())
      .map((s) => ({
        ...s,
        bins: Array.from(s.bins.values())
          .map((bin) => ({
            ...bin,
            themeGroups: Array.from(bin.themes.entries())
              .map(([theme, items]) => ({ theme, items }))
              .sort((a, b) => a.theme.localeCompare(b.theme)),
          }))
          .sort((a, b) => a.binNumber - b.binNumber),
      }))
      .sort((a, b) => a.shelfName.localeCompare(b.shelfName));
  }, [resources, teacherBooks]);

  const totalItems = resources.length + teacherBooks.length;

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q") as string;
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q); else params.delete("q");
    router.push(`/resources?${params.toString()}`);
  };

  const handleCategoryChange = (newCategoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newCategoryId) params.set("resourceCategoryId", newCategoryId);
    else params.delete("resourceCategoryId");
    router.push(`/resources?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">📦 Teacher Resource Materials</h1>
        <div className="flex gap-2">
          <Link
            href="/resources/checkout"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            ✅ Check Out
          </Link>
          <Link
            href="/resources/checkin"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            ↩️ Check In
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search resources and books..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 text-sm">
            Search
          </button>
        </form>
        <select
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="">All Themes</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Summary badges */}
      {!loading && totalItems > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
            📦 {resources.length} resource{resources.length !== 1 ? "s" : ""}
          </span>
          {teacherBooks.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">
              📕 {teacherBooks.length} book{teacherBooks.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {(query || categoryId) && (
        <p className="text-sm text-gray-500">
          {query && <>Showing results for &ldquo;{query}&rdquo;</>}
          {query && categoryId && " in "}
          {categoryId && <>{categories.find(c => c.id === categoryId)?.name || "selected theme"}</>}
          {" "}({totalItems} found)
        </p>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading resources...</div>
      ) : totalItems === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">{query ? "No resources match your search." : "No resources in the library yet."}</p>
        </div>
      ) : (
        // Shelf → Bin → Theme → Items
        <div className="space-y-8">
          {grouped.map((shelf) => (
            <div key={shelf.shelfName}>
              <h2 className="text-lg font-bold text-gray-800 mb-3">📚 {shelf.shelfName}</h2>
              <div className="space-y-4">
                {shelf.bins.map((bin) => (
                  <div key={`${bin.binLabel}-${bin.binNumber}`} className="border-2 border-emerald-200 rounded-xl overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 flex items-center gap-2">
                      <h3 className="font-semibold text-emerald-800">📥 {bin.binLabel}</h3>
                      <span className="text-xs text-gray-400">
                        {bin.themeGroups.reduce((sum, g) => sum + g.items.length, 0)} items
                      </span>
                    </div>
                    <div className="divide-y divide-emerald-100">
                      {bin.themeGroups.map(({ theme, items }) => (
                        <div key={theme} className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-medium">
                              🎨 {theme}
                            </span>
                            <span className="text-xs text-gray-400">
                              {items.length} item{items.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="grid gap-2">
                            {items.map((item) =>
                              item.kind === "resource" ? (
                                <ResourceCard
                                  key={`r-${item.id}`}
                                  id={item.id}
                                  name={item.name}
                                  description={item.detail}
                                  quantity={item.quantity}
                                  availableQuantity={item.available}
                                  categoryName={item.theme}
                                  checkedOutBy={item.checkedOutBy}
                                />
                              ) : (
                                <Link
                                  key={`b-${item.id}`}
                                  href={`/books/${item.id}`}
                                  className="block bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex gap-3 flex-1 min-w-0">
                                      <div className="w-10 h-13 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                        {item.coverImageUrl ? (
                                          <img src={item.coverImageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-lg">📕</div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                                        {item.detail && (
                                          <p className="text-sm text-gray-500">{item.detail}</p>
                                        )}
                                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                                          📕 Book
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-4">
                                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                                        item.available > 0
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                      }`}>
                                        {item.available}/{item.quantity} available
                                      </span>
                                    </div>
                                  </div>
                                </Link>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading resources...</div>}>
      <ResourcesContent />
    </Suspense>
  );
}
