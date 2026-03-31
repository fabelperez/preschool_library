"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
}

interface Qualifier {
  id: string;
  name: string;
}

interface BinOption {
  id: string;
  label: string;
  shelfName: string;
}

interface ResourceOption {
  id: string;
  name: string;
  binLabel: string;
  shelfName: string;
}

interface ResourceCategoryOption {
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
    qualifierId?: string | null;
    binId?: string | null;
    resourceId?: string | null;
    resourceCategoryId?: string | null;
  };
  onSubmit: (data: {
    isbn: string;
    title: string;
    author: string;
    coverImageUrl: string;
    totalCopies: number;
    categoryId: string;
    qualifierId: string;
    binId: string;
    resourceId: string;
    resourceCategoryId: string;
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
  const [qualifierId, setQualifierId] = useState(initialData?.qualifierId || "");
  const [binId, setBinId] = useState(initialData?.binId || "");
  const [resourceId, setResourceId] = useState(initialData?.resourceId || "");
  const [resourceCategoryId, setResourceCategoryId] = useState(initialData?.resourceCategoryId || "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [qualifiers, setQualifiers] = useState<Qualifier[]>([]);
  const [bins, setBins] = useState<BinOption[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [resourceCategories, setResourceCategories] = useState<ResourceCategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newQualifierName, setNewQualifierName] = useState("");
  const [showNewQualifier, setShowNewQualifier] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/qualifiers").then((r) => r.json()),
      fetch("/api/bins").then((r) => r.json()),
      fetch("/api/resources").then((r) => r.json()),
      fetch("/api/resource-categories").then((r) => r.json()),
    ]).then(([cats, quals, binData, resourceData, rcData]) => {
      setCategories(cats);
      setQualifiers(quals);
      // Default new items to "General" qualifier
      if (!initialData?.qualifierId) {
        const general = quals.find((q: Qualifier) => q.name === "General");
        if (general) setQualifierId(general.id);
      }
      setBins(
        binData.map((b: { id: string; label: string | null; number: number; shelf: { name: string } }) => ({
          id: b.id,
          label: `${b.shelf.name} → ${b.label || `Bin ${b.number}`}`,
          shelfName: b.shelf.name,
        }))
      );
      setResources(
        resourceData.map((r: { id: string; name: string; bin?: { label: string | null; number: number; shelf: { name: string } } }) => ({
          id: r.id,
          name: r.name,
          binLabel: r.bin ? (r.bin.label || `Bin ${r.bin.number}`) : "",
          shelfName: r.bin?.shelf?.name || "",
        }))
      );
      setResourceCategories(rcData);
    }).catch(console.error);
  }, []);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
        setCategoryId(newCat.id);
        setNewCategoryName("");
        setShowNewCategory(false);
      }
    } catch { /* ignore */ }
  };

  const handleCreateQualifier = async () => {
    if (!newQualifierName.trim()) return;
    try {
      const res = await fetch("/api/qualifiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newQualifierName.trim() }),
      });
      if (res.ok) {
        const newQual = await res.json();
        setQualifiers((prev) => [...prev, newQual].sort((a, b) => a.name.localeCompare(b.name)));
        setQualifierId(newQual.id);
        setNewQualifierName("");
        setShowNewQualifier(false);
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit({ isbn, title, author, coverImageUrl: coverImageUrl || "", totalCopies, categoryId, qualifierId, binId, resourceId, resourceCategoryId });
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
        <div className="flex gap-2">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewCategory(!showNewCategory)}
            className="px-3 py-2 text-sm text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50"
          >
            + New
          </button>
        </div>
        {showNewCategory && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleCreateCategory}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Create
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Qualifier</label>
        <div className="flex gap-2">
          <select
            value={qualifierId}
            onChange={(e) => setQualifierId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No qualifier</option>
            {qualifiers.map((q) => (
              <option key={q.id} value={q.id}>{q.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewQualifier(!showNewQualifier)}
            className="px-3 py-2 text-sm text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50"
          >
            + New
          </button>
        </div>
        {showNewQualifier && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newQualifierName}
              onChange={(e) => setNewQualifierName(e.target.value)}
              placeholder="New qualifier name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleCreateQualifier}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              Create
            </button>
          </div>
        )}
      </div>

      {qualifiers.find((q) => q.id === qualifierId)?.name === "Teacher Resource" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
            <select
              value={resourceCategoryId}
              onChange={(e) => setResourceCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">General</option>
              {resourceCategories.map((rc) => (
                <option key={rc.id} value={rc.id}>{rc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attached Resource</label>
          <select
            value={resourceId}
            onChange={(e) => {
              setResourceId(e.target.value);
              // Auto-set bin from the selected resource
              const res = resources.find((r) => r.id === e.target.value);
              if (res) {
                const matchingBin = bins.find((b) => b.label.includes(res.binLabel) && b.label.includes(res.shelfName));
                if (matchingBin) setBinId(matchingBin.id);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No resource (standalone book)</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.shelfName} → {r.binLabel}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Books attached to a resource will have their availability managed by the resource&apos;s checkouts.
          </p>
          </div>
        </>
      )}

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
