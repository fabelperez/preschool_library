"use client";

import { useEffect, useState, Suspense } from "react";
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
    shelf: { id: string; name: string };
  };
  checkedOutBy: { teacherName: string; checkedOutAt: string }[];
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

    fetch(`/api/resources?${params.toString()}`)
      .then((r) => r.json())
      .then(setResources)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query, categoryId]);

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
        <h1 className="text-2xl font-bold text-gray-900">📦 Teacher Resources</h1>
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
        <div className="grid gap-3">
          {resources.map((resource) => (
            <Link
              key={resource.id}
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
