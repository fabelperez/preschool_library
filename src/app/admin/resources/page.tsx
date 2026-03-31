"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/AdminHeader";

interface ResourceCategory {
  id: string;
  name: string;
  description: string | null;
  _count: { resources: number };
}

interface Shelf {
  id: string;
  name: string;
  type: string;
  bins: { id: string; number: number; label: string | null; _count: { resources: number; books: number } }[];
}

export default function AdminResourcesPage() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/shelves").then((r) => r.json()),
      fetch("/api/resource-categories").then((r) => r.json()),
    ]).then(([s, c]) => {
      setShelves(s.filter((shelf: Shelf) => shelf.type === "resource"));
      setCategories(c);
    }).catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const allBins = shelves.flatMap((s) =>
    s.bins.map((b) => ({ ...b, shelf: { id: s.id, name: s.name } }))
  );

  const handleAddShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/shelves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newShelfName, type: "resource" }),
    });
    if (res.ok) {
      setNewShelfName("");
      setMessage({ type: "success", text: "Resource shelf created!" });
      fetchData();
    } else {
      setMessage({ type: "error", text: "Failed to create shelf" });
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
      setMessage({ type: "success", text: "Bin created!" });
      fetchData();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to create bin" });
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
      setMessage({ type: "success", text: "Theme created!" });
      fetchData();
    } else {
      setMessage({ type: "error", text: "Failed to create theme" });
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newResName, resourceCategoryId: newResCatId, binId: newResBinId, quantity: newResQty }),
    });
    if (res.ok) {
      setNewResName("");
      setNewResQty(1);
      setMessage({ type: "success", text: "Resource created!" });
      fetchData();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to create resource" });
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-8">
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

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {/* Resource Shelves */}
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

      {/* Bins */}
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

      {/* Themes (Resource Categories) */}
      <section className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-lg text-gray-800 mb-4">🎨 Themes</h2>
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {categories.map((cat) => (
              <span key={cat.id} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                {cat.name} ({cat._count.resources})
              </span>
            ))}
          </div>
        )}
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
      </section>

      {/* Add Resource */}
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
          <div className="flex gap-2 flex-wrap">
            <select
              value={newResBinId}
              onChange={(e) => setNewResBinId(e.target.value)}
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select bin...</option>
              {allBins.map((b) => (
                <option key={b.id} value={b.id}>{b.shelf.name} → {b.label || `Bin ${b.number}`}</option>
              ))}
            </select>
            <select
              value={newResCatId}
              onChange={(e) => setNewResCatId(e.target.value)}
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select theme...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
  );
}
