"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

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

interface ResourceCategory {
  id: string;
  name: string;
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Link
      href={`/resources/${resource.id}`}
      className="block bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{resource.name}</h3>
          {resource.description && (
            <p className="text-sm text-gray-500 mt-1 truncate">{resource.description}</p>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              {resource.resourceCategory.name}
            </span>
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
              {resource.bin.shelf.name} → {resource.bin.label || `Bin ${resource.bin.number}`}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 ml-4 text-right">
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            resource.availableQuantity > 0
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
            {resource.availableQuantity}/{resource.quantity}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ResourcesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const categoryId = searchParams.get("resourceCategoryId") || "";
  const shelfId = searchParams.get("shelfId") || "";
  const binId = searchParams.get("binId") || "";
  const [resources, setResources] = useState<Resource[]>([]);
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
      .then(setResources)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query, categoryId, shelfId, binId]);

  // Group resources: Shelf → Bin (with theme) → Resources
  const grouped = useMemo(() => {
    const shelfMap = new Map<string, {
      shelfName: string;
      bins: Map<string, {
        binLabel: string;
        binNumber: number;
        theme: string;
        resources: Resource[];
      }>;
    }>();

    for (const r of resources) {
      const shelfKey = r.bin?.shelf?.id || "_default";
      if (!shelfMap.has(shelfKey)) {
        shelfMap.set(shelfKey, {
          shelfName: r.bin?.shelf?.name || "Default Shelf",
          bins: new Map(),
        });
      }
      const shelf = shelfMap.get(shelfKey)!;
      const binKey = r.bin?.id || "_default";
      if (!shelf.bins.has(binKey)) {
        shelf.bins.set(binKey, {
          binLabel: r.bin?.label || "Default",
          binNumber: r.bin?.number ?? 0,
          theme: r.bin?.theme || "General",
          resources: [],
        });
      }
      shelf.bins.get(binKey)!.resources.push(r);
    }

    return Array.from(shelfMap.values())
      .map((s) => ({
        ...s,
        bins: Array.from(s.bins.values()).sort((a, b) => a.binNumber - b.binNumber),
      }))
      .sort((a, b) => a.shelfName.localeCompare(b.shelfName));
  }, [resources]);

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
            placeholder="Search resources..."
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

      {(query || categoryId) && (
        <p className="text-sm text-gray-500">
          {query && <>Showing results for &ldquo;{query}&rdquo;</>}
          {query && categoryId && " in "}
          {categoryId && <>{categories.find(c => c.id === categoryId)?.name || "selected theme"}</>}
          {" "}({resources.length} found)
        </p>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading resources...</div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">{query ? "No resources match your search." : "No resources in the library yet."}</p>
        </div>
      ) : (
        // Shelf → Bin (theme) → Resources
        <div className="space-y-8">
          {grouped.map((shelf) => (
            <div key={shelf.shelfName}>
              <h2 className="text-lg font-bold text-gray-800 mb-3">📚 {shelf.shelfName}</h2>
              <div className="space-y-4">
                {shelf.bins.map((bin) => (
                  <div key={`${bin.binLabel}-${bin.binNumber}`} className="border-2 border-emerald-200 rounded-xl overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 flex items-center gap-2">
                      <h3 className="font-semibold text-emerald-800">📥 {bin.binLabel}</h3>
                      <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                        🎨 {bin.theme}
                      </span>
                      <span className="text-xs text-gray-400">{bin.resources.length} resources</span>
                    </div>
                    <div className="grid gap-2 p-3">
                      {bin.resources.map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} />
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
