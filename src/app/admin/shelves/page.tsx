"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/AdminHeader";
import { useConfirm } from "@/hooks/useConfirm";

interface Category {
  id: string;
  name: string;
  _count?: { books: number };
}

interface ShelfSection {
  id: string;
  label: string | null;
  position: number;
  category: Category;
}

interface Shelf {
  id: string;
  name: string;
  type: string;
  position: number;
  sections: ShelfSection[];
  bins: { id: string; number: number; label: string | null }[];
}

export default function ManageShelvesPage() {
  const { confirm, ConfirmDialogHost } = useConfirm();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newShelfName, setNewShelfName] = useState("");
  const [newShelfSections, setNewShelfSections] = useState<{ categoryId: string; label: string }[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [shelvesRes, catsRes] = await Promise.all([
        fetch("/api/shelves"),
        fetch("/api/categories"),
      ]);
      const shelvesData = await shelvesRes.json();
      const catsData = await catsRes.json();
      setShelves(shelvesData);
      setCategories(catsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const addSection = () => {
    setNewShelfSections([...newShelfSections, { categoryId: "", label: "" }]);
  };

  const removeSection = (index: number) => {
    setNewShelfSections(newShelfSections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: "categoryId" | "label", value: string) => {
    const updated = [...newShelfSections];
    updated[index] = { ...updated[index], [field]: value };
    setNewShelfSections(updated);
  };

  const handleAddShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const res = await fetch("/api/shelves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newShelfName,
          position: shelves.length + 1,
          sections: newShelfSections
            .filter((s) => s.categoryId)
            .map((s, i) => ({ categoryId: s.categoryId, label: s.label || null, position: i + 1 })),
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Shelf created!" });
        setNewShelfName("");
        setNewShelfSections([]);
        setShowAddForm(false);
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to create shelf" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    }
  };

  const handleDeleteShelf = async (shelfId: string) => {
    const ok = await confirm({
      title: "Delete shelf?",
      description: "This will delete the shelf and all its sections.",
      confirmText: "Delete",
    });
    if (!ok) return;
    
    await fetch(`/api/shelves/${shelfId}`, { method: "DELETE" });
    fetchData();
    setMessage({ type: "success", text: "Shelf deleted" });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (res.ok) {
        setNewCategoryName("");
        setMessage({ type: "success", text: "Category added!" });
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to add category" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    const ok = await confirm({
      title: "Delete category?",
      description: "Books in this category will become uncategorized.",
      confirmText: "Delete",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/categories/${catId}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: "Category deleted" });
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to delete category" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <ConfirmDialogHost />
      <AdminHeader
        icon="🗄️"
        title="Manage Shelves"
        description="Configure library shelves, sections, and categories"
        action={
          <div className="flex gap-2">
            <Link
              href="/admin/shelves/layout"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
            >
              📐 Edit Room Layout
            </Link>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              {showAddForm ? "Cancel" : "+ Add Shelf"}
            </button>
          </div>
        }
      />

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddShelf} className="bg-gray-50 border rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Name</label>
            <input
              type="text"
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              required
              placeholder="e.g., Shelf D - Back Wall"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Sections</label>
              <button type="button" onClick={addSection} className="text-sm text-indigo-600 hover:underline">
                + Add Section
              </button>
            </div>
            {newShelfSections.map((section, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select
                  value={section.categoryId}
                  onChange={(e) => updateSection(i, "categoryId", e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={section.label}
                  onChange={(e) => updateSection(i, "label", e.target.value)}
                  placeholder="Section label"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button type="button" onClick={() => removeSection(i)} className="px-2 text-red-500 hover:text-red-700">✕</button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Create Shelf
          </button>
        </form>
      )}

      {shelves.length === 0 ? (
        <p className="text-gray-500 text-center py-12 bg-gray-50 rounded-lg">No shelves yet. Add your first shelf above.</p>
      ) : (
        <div className="space-y-4">
          {shelves.map((shelf) => (
            <div key={shelf.id} className="border-2 border-amber-200 rounded-xl p-5 bg-amber-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-amber-900">{shelf.name}</h3>
                  <p className="text-sm text-amber-700">
                    {shelf.type === "resource" ? "🧩 Teacher Resource Materials" : "📖 General Book"} ·{" "}
                    {shelf.type === "resource"
                      ? `${shelf.bins?.length || 0} bins`
                      : `${shelf.sections.length} sections`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/shelves/${shelf.id}/edit`} className="text-sm text-amber-600 hover:underline font-medium">
                    Edit
                  </Link>
                  <Link href={`/shelves/${shelf.id}`} className="text-sm text-indigo-600 hover:underline">
                    View
                  </Link>
                  <button
                    onClick={() => handleDeleteShelf(shelf.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {shelf.sections.length > 0 && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {shelf.sections.map((section) => (
                    <div key={section.id} className="bg-white rounded-lg p-2 text-sm text-center border border-amber-200">
                      <div className="font-medium">{section.label || section.category.name}</div>
                      <div className="text-xs text-gray-500">{section.category.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Book Categories Management */}
      <section className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-lg text-gray-800">📂 Book Categories</h2>
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                {cat.name} {cat._count ? `(${cat._count.books})` : ""}
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="ml-1 text-indigo-400 hover:text-red-600 text-xs"
                  title="Delete category"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name (e.g., Animals, Weather)..."
            required
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
            + Add Category
          </button>
        </form>
      </section>
    </div>
  );
}
