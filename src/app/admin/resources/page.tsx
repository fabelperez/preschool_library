"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/AdminHeader";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/hooks/useConfirm";

interface ResourceCategory {
  id: string;
  name: string;
  description: string | null;
  _count: { resources: number };
}

interface BookSummary {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverImageUrl: string | null;
  resourceCategoryId: string | null;
}

interface Shelf {
  id: string;
  name: string;
  type: string;
  bins: { id: string; number: number; label: string | null; _count: { resources: number; books: number } }[];
}

interface ResourceItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  status: string;
  statusNote: string | null;
  resourceCategory: { id: string; name: string } | null;
  bin: { id: string; label: string | null; number: number; shelf: { name: string } } | null;
}

const TABS = ["Shelves", "Themes", "Resources"] as const;
type Tab = typeof TABS[number];

export default function AdminResourcesPage() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Shelves");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "lost" | "damaged">("all");

  // New shelf form
  const [newShelfName, setNewShelfName] = useState("");
  // New bin form
  const [newBinShelfId, setNewBinShelfId] = useState("");
  const [newBinNumber, setNewBinNumber] = useState(1);
  const [newBinLabel, setNewBinLabel] = useState("");
  // New category form
  const [newCatName, setNewCatName] = useState("");
  // New resource form
  const [newResName, setNewResName] = useState("");
  const [newResBinId, setNewResBinId] = useState("");
  const [newResCatId, setNewResCatId] = useState("");
  const [newResQty, setNewResQty] = useState(1);
  // Inline-create fields for the resource form
  const [resShelfId, setResShelfId] = useState("");
  const [newResShelfName, setNewResShelfName] = useState("");
  const [newResBinNumber, setNewResBinNumber] = useState(1);
  const [newResBinLabel, setNewResBinLabel] = useState("");
  const [newResCatName, setNewResCatName] = useState("");

  const toast = useToast();
  const { confirm, ConfirmDialogHost } = useConfirm();

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/shelves").then((r) => r.json()),
      fetch("/api/resource-categories").then((r) => r.json()),
      fetch("/api/books").then((r) => r.json()),
      fetch("/api/resources").then((r) => r.json()),
    ]).then(([s, c, b, res]) => {
      setShelves(s.filter((shelf: Shelf) => shelf.type === "resource"));
      setCategories(c);
      setBooks(Array.isArray(b) ? b : (b.books ?? []));
      setResources(Array.isArray(res.resources) ? res.resources : []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const allBins = shelves.flatMap((s) =>
    s.bins.map((b) => ({ ...b, shelf: { id: s.id, name: s.name } }))
  );

  // Bins filtered to the shelf selected in the resource form
  const resBins = resShelfId && resShelfId !== "__new__"
    ? allBins.filter((b) => b.shelf.id === resShelfId)
    : [];

  const handleAddShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/shelves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newShelfName, type: "resource" }),
    });
    if (res.ok) {
      setNewShelfName("");
      toast.success("Resource shelf created!");
      fetchData();
    } else {
      toast.error("Failed to create shelf");
    }
  };

  const handleAddBin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/bins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: newBinNumber, label: newBinLabel || `Bin ${newBinNumber}`, shelfId: newBinShelfId }),
    });
    if (res.ok) {
      setNewBinNumber(1);
      setNewBinLabel("");
      toast.success("Bin created!");
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create bin");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/resource-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName }),
    });
    if (res.ok) {
      setNewCatName("");
      toast.success("Theme created!");
      fetchData();
    } else {
      toast.error("Failed to create theme");
    }
  };

  // --- Themes tab: book assignment state ---
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const [themeSearchQuery, setThemeSearchQuery] = useState<Record<string, string>>({});
  const [themeSearchResults, setThemeSearchResults] = useState<BookSummary[]>([]);
  const [searchingFor, setSearchingFor] = useState<string | null>(null); // theme id being searched
  const [showQuickAdd, setShowQuickAdd] = useState<string | null>(null); // theme id
  const [qaTitle, setQaTitle] = useState("");
  const [qaAuthor, setQaAuthor] = useState("");
  const [qaIsbn, setQaIsbn] = useState("");
  const [qaCopies, setQaCopies] = useState(1);

  const handleThemeSearch = async (themeId: string, query: string) => {
    setThemeSearchQuery((prev) => ({ ...prev, [themeId]: query }));
    if (!query.trim()) { setThemeSearchResults([]); setSearchingFor(null); return; }
    setSearchingFor(themeId);
    const res = await fetch(`/api/books?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data: BookSummary[] = await res.json();
      setThemeSearchResults(data);
    }
  };

  const handleAssignBook = async (themeId: string, bookId: string) => {
    const res = await fetch(`/api/books/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceCategoryId: themeId }),
    });
    if (res.ok) {
      setThemeSearchQuery((prev) => ({ ...prev, [themeId]: "" }));
      setThemeSearchResults([]);
      setSearchingFor(null);
      toast.success("Book added to theme!");
      fetchData();
    } else {
      toast.error("Failed to assign book");
    }
  };

  const handleRemoveBookFromTheme = async (bookId: string) => {
    const res = await fetch(`/api/books/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceCategoryId: null }),
    });
    if (res.ok) {
      toast.success("Book removed from theme");
      fetchData();
    } else {
      toast.error("Failed to remove book");
    }
  };

  const handleQuickAddBook = async (e: React.FormEvent, themeId: string) => {
    e.preventDefault();
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: qaTitle,
        author: qaAuthor,
        isbn: qaIsbn || null,
        totalCopies: qaCopies,
        resourceCategoryId: themeId,
      }),
    });
    if (res.ok) {
      setQaTitle(""); setQaAuthor(""); setQaIsbn(""); setQaCopies(1);
      setShowQuickAdd(null);
      toast.success("Book added!");
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add book");
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();

    let resolvedShelfId = resShelfId;
    let resolvedBinId = newResBinId;
    let resolvedCatId = newResCatId;

    // 1. Create new shelf if needed
    if (resShelfId === "__new__") {
      const r = await fetch("/api/shelves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newResShelfName, type: "resource" }),
      });
      if (!r.ok) { toast.error("Failed to create shelf"); return; }
      const data = await r.json();
      resolvedShelfId = data.id;
    }

    // 2. Create new bin if needed
    if (newResBinId === "__new__") {
      const r = await fetch("/api/bins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: newResBinNumber,
          label: newResBinLabel || `Bin ${newResBinNumber}`,
          shelfId: resolvedShelfId,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        toast.error(d.error || "Failed to create bin");
        return;
      }
      const data = await r.json();
      resolvedBinId = data.id;
    }

    // 3. Create new theme if needed
    if (newResCatId === "__new__") {
      const r = await fetch("/api/resource-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newResCatName }),
      });
      if (!r.ok) { toast.error("Failed to create theme"); return; }
      const data = await r.json();
      resolvedCatId = data.id;
    }

    // 4. Create the resource
    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newResName,
        resourceCategoryId: resolvedCatId,
        binId: resolvedBinId,
        quantity: newResQty,
      }),
    });
    if (res.ok) {
      setNewResName("");
      setNewResQty(1);
      setResShelfId("");
      setNewResShelfName("");
      setNewResBinId("");
      setNewResBinNumber(1);
      setNewResBinLabel("");
      setNewResCatId("");
      setNewResCatName("");
      toast.success("Resource created!");
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create resource");
    }
  };

  const handleResourceStatusChange = async (
    resource: ResourceItem,
    newStatus: "available" | "lost" | "damaged",
    note?: string
  ) => {
    if (newStatus === "lost") {
      const ok = await confirm({
        title: "Mark Resource as Lost?",
        description: `"${resource.name}" will be marked as lost and unavailable for checkout.`,
        confirmText: "Mark Lost",
        cancelText: "Cancel",
      });
      if (!ok) return;
    }
    const res = await fetch(`/api/resources/${resource.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, statusNote: note ?? null }),
    });
    if (res.ok) {
      toast.success(
        newStatus === "available" ? "Restored to available" :
        newStatus === "lost" ? "Marked as lost" : "Marked as damaged"
      );
      fetchData();
    } else {
      toast.error("Failed to update status");
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <AdminHeader
        icon="📦"
        title="Manage Resources"
        description="Organize shelves, themes, and teacher resource materials"
        action={
          <Link
            href="/resources"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            View Resources →
          </Link>
        }
      />

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab === "Shelves" && "🗄️ "}
            {tab === "Themes" && "🎨 "}
            {tab === "Resources" && "➕ "}
            {tab}
          </button>
        ))}
      </div>

      {/* Shelves tab — Resource Shelves + Bins */}
      {activeTab === "Shelves" && (
        <div className="space-y-6">
          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-lg text-gray-800 mb-4">🗄️ Resource Shelves</h2>
            {shelves.length > 0 && (
              <div className="grid gap-2 mb-4">
                {shelves.map((shelf) => (
                  <div key={shelf.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">{shelf.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({shelf.bins.length} bins)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddShelf} className="flex gap-2">
              <input
                type="text"
                value={newShelfName}
                onChange={(e) => setNewShelfName(e.target.value)}
                placeholder="New resource shelf name..."
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                + Add Shelf
              </button>
            </form>
          </section>

          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-lg text-gray-800 mb-4">📥 Bins</h2>
            {allBins.length > 0 && (
              <div className="grid gap-2 mb-4">
                {allBins.map((bin) => (
                  <div key={bin.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">{bin.label || `Bin ${bin.number}`}</span>
                      <span className="text-sm text-gray-500 ml-2">on {bin.shelf.name}</span>
                      <span className="text-sm text-gray-400 ml-2">({bin._count.resources} resources, {bin._count.books} books)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddBin} className="flex gap-2 flex-wrap">
              <select
                value={newBinShelfId}
                onChange={(e) => setNewBinShelfId(e.target.value)}
                required
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select shelf...</option>
                {shelves.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input
                type="number"
                value={newBinNumber}
                onChange={(e) => setNewBinNumber(parseInt(e.target.value) || 1)}
                min={1}
                placeholder="Bin #"
                required
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                value={newBinLabel}
                onChange={(e) => setNewBinLabel(e.target.value)}
                placeholder="Label (optional)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                + Add Bin
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Themes tab */}
      {activeTab === "Themes" && (
        <div className="space-y-4">
          {/* Theme cards */}
          {categories.map((cat) => {
            const themeBooks = books.filter((b) => b.resourceCategoryId === cat.id);
            const isExpanded = expandedTheme === cat.id;
            const searchQuery = themeSearchQuery[cat.id] ?? "";
            const isSearching = searchingFor === cat.id;
            const filteredResults = themeSearchResults.filter(
              (b) => b.resourceCategoryId !== cat.id
            );

            return (
              <div key={cat.id} className="bg-white border rounded-xl overflow-hidden">
                {/* Card header */}
                <button
                  onClick={() => setExpandedTheme(isExpanded ? null : cat.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎨</span>
                    <span className="font-semibold text-gray-800">{cat.name}</span>
                    <span className="text-sm text-gray-500">
                      {themeBooks.length} book{themeBooks.length !== 1 ? "s" : ""}
                      {" · "}
                      {cat._count.resources} resource{cat._count.resources !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t px-5 py-4 space-y-4">
                    {/* Book list */}
                    {themeBooks.length > 0 ? (
                      <ul className="space-y-1">
                        {themeBooks.map((book) => (
                          <li key={book.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50">
                            <span className="text-sm text-gray-800">
                              <span className="mr-1">📚</span>
                              {book.title}
                              <span className="text-gray-400 ml-1">— {book.author}</span>
                            </span>
                            <button
                              onClick={() => handleRemoveBookFromTheme(book.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none ml-3"
                              title="Remove from theme"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No books in this theme yet.</p>
                    )}

                    {/* Assign existing book */}
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleThemeSearch(cat.id, e.target.value)}
                        placeholder="🔍 Search to assign an existing book..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      />
                      {isSearching && filteredResults.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredResults.map((book) => (
                            <li key={book.id}>
                              <button
                                type="button"
                                onClick={() => handleAssignBook(cat.id, book.id)}
                                className="w-full text-left px-4 py-2.5 hover:bg-green-50 text-sm"
                              >
                                <span className="font-medium text-gray-800">{book.title}</span>
                                <span className="text-gray-500 ml-1">— {book.author}</span>
                                {book.resourceCategoryId && (
                                  <span className="text-xs text-amber-600 ml-2">(moves from another theme)</span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {isSearching && searchQuery.trim() && filteredResults.length === 0 && (
                        <p className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500">
                          No books found for &ldquo;{searchQuery}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Quick-add new book toggle */}
                    {showQuickAdd !== cat.id ? (
                      <button
                        onClick={() => { setShowQuickAdd(cat.id); setQaTitle(""); setQaAuthor(""); setQaIsbn(""); setQaCopies(1); }}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        ➕ Quick-add a new book to this theme
                      </button>
                    ) : (
                      <form onSubmit={(e) => handleQuickAddBook(e, cat.id)} className="space-y-2 bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-sm font-medium text-green-800 mb-1">New book → {cat.name}</p>
                        <input
                          type="text"
                          value={qaTitle}
                          onChange={(e) => setQaTitle(e.target.value)}
                          placeholder="Title *"
                          required
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white"
                        />
                        <input
                          type="text"
                          value={qaAuthor}
                          onChange={(e) => setQaAuthor(e.target.value)}
                          placeholder="Author *"
                          required
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={qaIsbn}
                            onChange={(e) => setQaIsbn(e.target.value)}
                            placeholder="ISBN (optional)"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white"
                          />
                          <input
                            type="number"
                            value={qaCopies}
                            onChange={(e) => setQaCopies(parseInt(e.target.value) || 1)}
                            min={1}
                            className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white"
                            title="Copies"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                            + Add Book
                          </button>
                          <button type="button" onClick={() => setShowQuickAdd(null)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new theme form */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-medium text-gray-700 mb-3">➕ Add New Theme</h3>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New theme name (e.g., Fall, Winter)..."
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                + Add Theme
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Resources tab */}
      {activeTab === "Resources" && (
        <div className="space-y-6">
          {/* Existing resources list */}
          <section className="bg-white border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-lg text-gray-800">📦 Resources ({resources.length})</h2>
              <div className="flex gap-1">
                {(["all", "available", "damaged", "lost"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      statusFilter === f
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ul className="divide-y">
              {resources
                .filter((r) => statusFilter === "all" || r.status === statusFilter)
                .map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 text-sm">{r.name}</span>
                        {r.status === "lost" && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Lost</span>
                        )}
                        {r.status === "damaged" && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Damaged</span>
                        )}
                        {r.status === "available" && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Available</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {r.resourceCategory?.name && <span>{r.resourceCategory.name}</span>}
                        {r.bin && <span> · {r.bin.shelf.name} › {r.bin.label || `Bin ${r.bin.number}`}</span>}
                        <span> · qty {r.quantity}</span>
                        {r.statusNote && <span className="italic"> · {r.statusNote}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {r.status !== "lost" && (
                        <button
                          onClick={() => handleResourceStatusChange(r, "lost")}
                          className="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                        >
                          Lost
                        </button>
                      )}
                      {r.status !== "damaged" && (
                        <button
                          onClick={() => {
                            const note = window.prompt("Optional note about the damage:");
                            handleResourceStatusChange(r, "damaged", note ?? undefined);
                          }}
                          className="px-2 py-1 text-xs rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium"
                        >
                          Damaged
                        </button>
                      )}
                      {r.status !== "available" && (
                        <button
                          onClick={() => handleResourceStatusChange(r, "available")}
                          className="px-2 py-1 text-xs rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              {resources.filter((r) => statusFilter === "all" || r.status === statusFilter).length === 0 && (
                <li className="px-5 py-8 text-center text-gray-400 text-sm">No resources found.</li>
              )}
            </ul>
          </section>

          {/* Add resource form */}
          <section className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-lg text-gray-800 mb-4">➕ Add Resource</h2>
          <form onSubmit={handleAddResource} className="space-y-3">
            <input
              type="text"
              value={newResName}
              onChange={(e) => setNewResName(e.target.value)}
              placeholder="Resource name..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            />

            {/* Shelf */}
            <div className="space-y-2">
              <select
                value={resShelfId}
                onChange={(e) => {
                  const val = e.target.value;
                  setResShelfId(val);
                  setNewResBinId(val === "__new__" ? "__new__" : "");
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select shelf...</option>
                {shelves.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                <option value="__new__">➕ New shelf...</option>
              </select>
              {resShelfId === "__new__" && (
                <input
                  type="text"
                  value={newResShelfName}
                  onChange={(e) => setNewResShelfName(e.target.value)}
                  placeholder="New shelf name..."
                  required
                  className="w-full px-3 py-2 border border-gray-200 bg-green-50 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                />
              )}
            </div>

            {/* Bin — only visible once a shelf is chosen */}
            {resShelfId && (
              <div className="space-y-2">
                <select
                  value={newResBinId}
                  onChange={(e) => setNewResBinId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select bin...</option>
                  {resBins.map((b) => (
                    <option key={b.id} value={b.id}>{b.label || `Bin ${b.number}`}</option>
                  ))}
                  <option value="__new__">➕ New bin...</option>
                </select>
                {newResBinId === "__new__" && (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newResBinNumber}
                      onChange={(e) => setNewResBinNumber(parseInt(e.target.value) || 1)}
                      min={1}
                      placeholder="Bin #"
                      required
                      className="w-24 px-3 py-2 border border-gray-200 bg-green-50 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      value={newResBinLabel}
                      onChange={(e) => setNewResBinLabel(e.target.value)}
                      placeholder="Label (optional)"
                      className="flex-1 px-3 py-2 border border-gray-200 bg-green-50 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Theme */}
            <div className="space-y-2">
              <select
                value={newResCatId}
                onChange={(e) => setNewResCatId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select theme...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="__new__">➕ New theme...</option>
              </select>
              {newResCatId === "__new__" && (
                <input
                  type="text"
                  value={newResCatName}
                  onChange={(e) => setNewResCatName(e.target.value)}
                  placeholder="New theme name (e.g., Fall, Winter)..."
                  required
                  className="w-full px-3 py-2 border border-gray-200 bg-green-50 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                />
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Quantity:</label>
              <input
                type="number"
                value={newResQty}
                onChange={(e) => setNewResQty(parseInt(e.target.value) || 1)}
                min={1}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
              + Add Resource
            </button>
          </form>
          </section>
        </div>
      )}
      <ConfirmDialogHost />
    </div>
  );
}
