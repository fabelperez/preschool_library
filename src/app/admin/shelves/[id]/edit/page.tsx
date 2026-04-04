"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminHeader from "@/components/AdminHeader";
import { groupByTheme } from "@/lib/groupByTheme";
import { useConfirm } from "@/hooks/useConfirm";
import { useToast } from "@/components/ToastProvider";

// ─── Types ───────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
}

interface ResourceCategory {
  id: string;
  name: string;
}

interface BookItem {
  id: string;
  title: string;
  author: string;
  categoryId: string | null;
  category: Category | null;
  resourceCategoryId?: string | null;
  resourceCategory?: ResourceCategory | null;
  resource?: {
    resourceCategory?: ResourceCategory | null;
  } | null;
}

interface ResourceItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  status: string;
  statusNote: string | null;
  resourceCategory: ResourceCategory | null;
  resourceCategoryId: string;
}

interface BinData {
  id: string;
  number: number;
  label: string | null;
  resources: ResourceItem[];
  books: BookItem[];
}

interface SectionData {
  id: string;
  label: string | null;
  position: number;
  category: Category & { books: BookItem[] };
}

interface ShelfData {
  id: string;
  name: string;
  type: string;
  position: number;
  sections: SectionData[];
  bins: BinData[];
}

// ─── Main Component ──────────────────────────────────────

export default function EditShelfPage() {
  const params = useParams();
  const shelfId = params.id as string;

  const [shelf, setShelf] = useState<ShelfData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [resourceCategories, setResourceCategories] = useState<ResourceCategory[]>([]);
  const [allBooks, setAllBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [type, setType] = useState("book");

  const fetchShelf = useCallback(async () => {
    try {
      const [shelfRes, catRes, rcRes, booksRes] = await Promise.all([
        fetch(`/api/shelves/${shelfId}`),
        fetch("/api/categories"),
        fetch("/api/resource-categories"),
        fetch("/api/books"),
      ]);
      const shelfData = await shelfRes.json();
      setShelf(shelfData);
      setName(shelfData.name);
      setType(shelfData.type);
      setCategories(await catRes.json());
      setResourceCategories(await rcRes.json());
      setAllBooks(await booksRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [shelfId]);

  useEffect(() => { fetchShelf(); }, [fetchShelf]);

  const handleSaveBasic = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/shelves/${shelfId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Shelf updated!" });
        fetchShelf();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to update" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading shelf...</div>;
  if (!shelf) return <div className="text-center py-12 text-red-500">Shelf not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/shelves" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
      </div>
      <AdminHeader icon="✏️" title="Edit Shelf" description={`Editing shelf: ${shelf?.name || ""}`} />

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {message.text}
        </div>
      )}

      {/* Basic Info */}
      <section className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-lg text-gray-800">Shelf Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="book">📖 General Book Shelf</option>
              <option value="resource">🧩 Teacher Resource Materials Shelf</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleSaveBasic}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </section>

      {/* Type-specific panels */}
      {type === "resource" ? (
        <ResourceShelfPanel
          shelfId={shelfId}
          bins={shelf.bins}
          resourceCategories={resourceCategories}
          allBooks={allBooks}
          onRefresh={fetchShelf}
          onMessage={setMessage}
        />
      ) : (
        <BookShelfPanel
          shelfId={shelfId}
          sections={shelf.sections}
          categories={categories}
          allBooks={allBooks}
          onRefresh={fetchShelf}
          onMessage={setMessage}
        />
      )}
    </div>
  );
}

// ─── Resource Shelf Panel ────────────────────────────────

function ResourceShelfPanel({
  shelfId,
  bins,
  resourceCategories,
  allBooks,
  onRefresh,
  onMessage,
}: {
  shelfId: string;
  bins: BinData[];
  resourceCategories: ResourceCategory[];
  allBooks: BookItem[];
  onRefresh: () => void;
  onMessage: (m: { type: "success" | "error"; text: string }) => void;
}) {
  const { confirm: confirmDialog, ConfirmDialogHost } = useConfirm();
  const toast = useToast();
  const [newBinLabel, setNewBinLabel] = useState("");
  const [newThemeName, setNewThemeName] = useState("");
  const [addingBin, setAddingBin] = useState(false);

  // Add resources/books modals
  const [addTobin, setAddToBin] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"resource" | "book">("resource");
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceDesc, setNewResourceDesc] = useState("");
  const [newResourceQty, setNewResourceQty] = useState(1);
  const [newResourceThemeId, setNewResourceThemeId] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [selectedBookThemeId, setSelectedBookThemeId] = useState("");

  const handleAddBin = async () => {
    setAddingBin(true);
    try {
      const nextNum = bins.length > 0 ? Math.max(...bins.map((b) => b.number)) + 1 : 1;
      const res = await fetch("/api/bins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: nextNum, label: newBinLabel || `Bin ${nextNum}`, shelfId }),
      });
      if (res.ok) {
        setNewBinLabel("");
        onMessage({ type: "success", text: "Bin added!" });
        onRefresh();
      }
    } catch {
      onMessage({ type: "error", text: "Failed to add bin" });
    } finally {
      setAddingBin(false);
    }
  };

  const handleDeleteBin = async (binId: string) => {
    const ok = await confirmDialog({
      title: "Delete bin?",
      description: "This will delete the bin and all its contents.",
      confirmText: "Delete",
    });
    if (!ok) return;
    await fetch(`/api/bins/${binId}`, { method: "DELETE" });
    onMessage({ type: "success", text: "Bin deleted" });
    onRefresh();
  };

  const handleResourceStatus = async (resourceId: string, newStatus: "available" | "lost" | "damaged") => {
    if (newStatus === "lost") {
      const ok = await confirmDialog({ title: "Mark resource as Lost?", description: "It will be unavailable for checkout.", confirmText: "Mark Lost" });
      if (!ok) return;
    }
    const res = await fetch(`/api/resources/${resourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(newStatus === "available" ? "Resource restored." : `Resource marked as ${newStatus}.`);
      onRefresh();
    } else {
      toast.error("Failed to update resource status");
    }
  };

  const handleAddTheme = async () => {
    if (!newThemeName.trim()) return;
    try {
      const res = await fetch("/api/resource-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newThemeName.trim() }),
      });
      if (res.ok) {
        setNewThemeName("");
        onMessage({ type: "success", text: "Theme created!" });
        onRefresh();
      }
    } catch {
      onMessage({ type: "error", text: "Failed to create theme" });
    }
  };

  const handleAddResource = async (binId: string) => {
    if (!newResourceName.trim() || !newResourceThemeId) return;
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newResourceName.trim(),
          description: newResourceDesc || null,
          quantity: newResourceQty,
          resourceCategoryId: newResourceThemeId,
          binId,
        }),
      });
      if (res.ok) {
        setNewResourceName("");
        setNewResourceDesc("");
        setNewResourceQty(1);
        setNewResourceThemeId("");
        setAddToBin(null);
        onMessage({ type: "success", text: "Resource added!" });
        onRefresh();
      }
    } catch {
      onMessage({ type: "error", text: "Failed to add resource" });
    }
  };

  const handleAssignBook = async (binId: string) => {
    if (!selectedBookId) return;
    try {
      const res = await fetch(`/api/books/${selectedBookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ binId, resourceCategoryId: selectedBookThemeId || null }),
      });
      if (res.ok) {
        setSelectedBookId("");
        setSelectedBookThemeId("");
        setAddToBin(null);
        onMessage({ type: "success", text: "Book assigned to bin!" });
        onRefresh();
      }
    } catch {
      onMessage({ type: "error", text: "Failed to assign book" });
    }
  };

  // Books not already in a bin on this shelf
  const availableBooks = allBooks.filter(
    (b: BookItem & { binId?: string | null }) =>
      !bins.some((bin) => bin.books.some((bb) => bb.id === b.id))
  );

  return (
    <>
      <ConfirmDialogHost />
      {/* Theme Management */}
      <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-lg text-amber-900">🎨 Themes</h2>
        <div className="flex flex-wrap gap-2">
          {resourceCategories.map((rc) => (
            <span key={rc.id} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
              {rc.name}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newThemeName}
            onChange={(e) => setNewThemeName(e.target.value)}
            placeholder="New theme name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
          />
          <button onClick={handleAddTheme} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
            + Add Theme
          </button>
        </div>
      </section>

      {/* Bin Management */}
      <section className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-lg text-green-900">📦 Bins</h2>

        {bins.length === 0 && <p className="text-sm text-gray-500">No bins yet. Add one below.</p>}

        {bins.map((bin) => (
          <div key={bin.id} className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-green-800">{bin.label || `Bin ${bin.number}`}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => { setAddToBin(bin.id); setAddMode("resource"); }}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  + Resource
                </button>
                <button
                  onClick={() => { setAddToBin(bin.id); setAddMode("book"); }}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  + Book
                </button>
                <button onClick={() => handleDeleteBin(bin.id)} className="text-xs text-red-500 hover:text-red-700">
                  Delete
                </button>
              </div>
            </div>

            {/* Items grouped by theme */}
            {(() => {
              const themes = groupByTheme(bin.resources, bin.books);
              return themes.length > 0 ? (
                <div className="space-y-2">
                  {themes.map((theme) => (
                    <div key={theme.themeName} className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs font-medium text-amber-700 mb-1">🎨 {theme.themeName}</p>
                      <div className="space-y-1">
                        {theme.resources.map((r) => (
                          <div key={r.id} className="flex justify-between items-center text-sm bg-green-50 px-2 py-1.5 rounded gap-2">
                            <span className="flex items-center gap-1.5 min-w-0">
                              🧩 <span className="truncate">{r.name}</span>
                              {r.status === "lost" && <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full shrink-0">🔍 Lost</span>}
                              {r.status === "damaged" && <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full shrink-0">🔧 Damaged</span>}
                            </span>
                            <div className="flex gap-1 shrink-0">
                              {r.status !== "lost" && (
                                <button onClick={() => handleResourceStatus(r.id, "lost")} title="Mark Lost" className="text-xs text-gray-400 hover:text-gray-700 px-1">🔍</button>
                              )}
                              {r.status !== "damaged" && (
                                <button onClick={() => handleResourceStatus(r.id, "damaged")} title="Mark Damaged" className="text-xs text-orange-300 hover:text-orange-600 px-1">🔧</button>
                              )}
                              {r.status !== "available" && (
                                <button onClick={() => handleResourceStatus(r.id, "available")} title="Restore" className="text-xs text-green-400 hover:text-green-700 px-1">✅</button>
                              )}
                            </div>
                          </div>
                        ))}
                        {theme.books.map((b) => (
                          <div key={b.id} className="flex justify-between items-center text-sm bg-blue-50 px-2 py-1 rounded">
                            <span>📖 {b.title}</span>
                            <span className="text-xs text-gray-500">{b.author}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Add resource/book form */}
            {addTobin === bin.id && addMode === "resource" && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium text-green-700">Add New Resource</p>
                <input
                  type="text"
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                  placeholder="Resource name..."
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={newResourceDesc}
                  onChange={(e) => setNewResourceDesc(e.target.value)}
                  placeholder="Description (optional)..."
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <select
                    value={newResourceThemeId}
                    onChange={(e) => setNewResourceThemeId(e.target.value)}
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                  >
                    <option value="">Select theme...</option>
                    {resourceCategories.map((rc) => (
                      <option key={rc.id} value={rc.id}>{rc.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newResourceQty}
                    onChange={(e) => setNewResourceQty(parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-20 px-3 py-1.5 border rounded-lg text-sm"
                    placeholder="Qty"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddResource(bin.id)}
                    disabled={!newResourceName.trim() || !newResourceThemeId}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    Add Resource
                  </button>
                  <button onClick={() => setAddToBin(null)} className="px-3 py-1.5 border rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {addTobin === bin.id && addMode === "book" && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium text-blue-700">Assign Existing Book to Bin</p>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                >
                  <option value="">Select a book...</option>
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} — {b.author}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedBookThemeId}
                  onChange={(e) => setSelectedBookThemeId(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                >
                  <option value="">Theme (General)</option>
                  {resourceCategories.map((rc) => (
                    <option key={rc.id} value={rc.id}>{rc.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAssignBook(bin.id)}
                    disabled={!selectedBookId}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    Assign Book
                  </button>
                  <button onClick={() => setAddToBin(null)} className="px-3 py-1.5 border rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add new bin */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newBinLabel}
            onChange={(e) => setNewBinLabel(e.target.value)}
            placeholder="New bin label (optional)..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={handleAddBin}
            disabled={addingBin}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
          >
            + Add Bin
          </button>
        </div>
      </section>
    </>
  );
}

// ─── Book Shelf Panel ────────────────────────────────────

function BookShelfPanel({
  shelfId,
  sections,
  categories,
  allBooks,
  onRefresh,
  onMessage,
}: {
  shelfId: string;
  sections: SectionData[];
  categories: Category[];
  allBooks: BookItem[];
  onRefresh: () => void;
  onMessage: (m: { type: "success" | "error"; text: string }) => void;
}) {
  const { confirm: confirmDialog, ConfirmDialogHost: ConfirmHost } = useConfirm();
  const [newSectionCatId, setNewSectionCatId] = useState("");
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [assignToSection, setAssignToSection] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState("");

  const handleAddSection = async () => {
    if (!newSectionCatId) return;
    // Append new section to existing
    const updatedSections = [
      ...sections.map((s, i) => ({ categoryId: s.category.id, label: s.label, position: i + 1 })),
      { categoryId: newSectionCatId, label: newSectionLabel || null, position: sections.length + 1 },
    ];
    try {
      const res = await fetch(`/api/shelves/${shelfId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: updatedSections }),
      });
      if (res.ok) {
        setNewSectionCatId("");
        setNewSectionLabel("");
        onMessage({ type: "success", text: "Section added!" });
        onRefresh();
      }
    } catch {
      onMessage({ type: "error", text: "Failed to add section" });
    }
  };

  const handleRemoveSection = async (index: number) => {
    const ok = await confirmDialog({
      title: "Remove section?",
      description: "This will remove the section from the shelf.",
      confirmText: "Remove",
    });
    if (!ok) return;
    const updatedSections = sections
      .filter((_, i) => i !== index)
      .map((s, i) => ({ categoryId: s.category.id, label: s.label, position: i + 1 }));
    try {
      const res = await fetch(`/api/shelves/${shelfId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: updatedSections }),
      });
      if (res.ok) {
        onMessage({ type: "success", text: "Section removed" });
        onRefresh();
      }
    } catch {
      onMessage({ type: "error", text: "Failed to remove section" });
    }
  };

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
        setNewCategoryName("");
        setShowNewCategory(false);
        setNewSectionCatId(newCat.id);
        onMessage({ type: "success", text: "Category created!" });
        onRefresh();
      }
    } catch {
      onMessage({ type: "error", text: "Failed to create category" });
    }
  };

  const handleAssignBook = async (categoryId: string) => {
    if (!selectedBookId) return;
    try {
      const res = await fetch(`/api/books/${selectedBookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      if (res.ok) {
        setSelectedBookId("");
        setAssignToSection(null);
        onMessage({ type: "success", text: "Book assigned to section!" });
        onRefresh();
      }
    } catch {
      onMessage({ type: "error", text: "Failed to assign book" });
    }
  };

  return (
    <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
      <ConfirmHost />
      <h2 className="font-semibold text-lg text-indigo-900">📚 Sections</h2>

      {sections.length === 0 && <p className="text-sm text-gray-500">No sections yet. Add one below.</p>}

      {sections.map((section, idx) => {
        // Books not already in this category
        const booksInSection = section.category.books || [];
        const availableBooks = allBooks.filter(
          (b) => b.categoryId !== section.category.id
        );

        return (
          <div key={section.id} className="bg-white border border-indigo-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-indigo-800">
                  {section.label || section.category.name}
                </h3>
                <p className="text-xs text-gray-500">Category: {section.category.name} · {booksInSection.length} book{booksInSection.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAssignToSection(assignToSection === section.id ? null : section.id)}
                  className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                >
                  + Book
                </button>
                <button onClick={() => handleRemoveSection(idx)} className="text-xs text-red-500 hover:text-red-700">
                  Remove
                </button>
              </div>
            </div>

            {/* Books in section */}
            {booksInSection.length > 0 && (
              <div className="space-y-1">
                {booksInSection.map((b: BookItem) => (
                  <div key={b.id} className="flex justify-between items-center text-sm bg-indigo-50 px-2 py-1 rounded">
                    <span>📖 {b.title}</span>
                    <span className="text-xs text-gray-500">{b.author}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Assign book */}
            {assignToSection === section.id && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium text-indigo-700">Assign Book to This Section</p>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                >
                  <option value="">Select a book...</option>
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} — {b.author} {b.category ? `(${b.category.name})` : ""}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAssignBook(section.category.id)}
                    disabled={!selectedBookId}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    Assign Book
                  </button>
                  <button onClick={() => setAssignToSection(null)} className="px-3 py-1.5 border rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add new section */}
      <div className="border-t border-indigo-200 pt-4 space-y-2">
        <p className="text-sm font-medium text-indigo-800">Add Section</p>
        <div className="flex gap-2">
          <select
            value={newSectionCatId}
            onChange={(e) => setNewSectionCatId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={newSectionLabel}
            onChange={(e) => setNewSectionLabel(e.target.value)}
            placeholder="Label (optional)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={handleAddSection}
            disabled={!newSectionCatId}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            + Add
          </button>
        </div>

        {/* Inline new category */}
        <button
          onClick={() => setShowNewCategory(!showNewCategory)}
          className="text-xs text-indigo-600 hover:underline"
        >
          {showNewCategory ? "Cancel" : "Need a new category? Create one"}
        </button>
        {showNewCategory && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <button onClick={handleCreateCategory} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">
              Create
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
