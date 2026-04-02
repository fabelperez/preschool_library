"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Teacher {
  id: string;
  name: string;
}

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
}

interface Shelf {
  id: string;
  name: string;
  type: string;
  bins: { id: string; number: number; label: string | null }[];
}

function ResourceCheckoutContent() {
  const searchParams = useSearchParams();
  const preselectedResourceId = searchParams.get("resourceId") || "";

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedShelfId, setSelectedShelfId] = useState("");
  const [selectedBinId, setSelectedBinId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState(preselectedResourceId);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/teachers").then((r) => r.json()),
      fetch("/api/shelves").then((r) => r.json()),
    ]).then(([t, s]) => {
      setTeachers(t);
      setShelves(s.filter((shelf: Shelf) => shelf.type === "resource"));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedBinId) {
      fetch(`/api/resources?binId=${selectedBinId}`)
        .then((r) => r.json())
        .then((data) => setResources(Array.isArray(data) ? data : data?.resources ?? []))
        .catch(console.error);
    } else if (preselectedResourceId) {
      fetch(`/api/resources/${preselectedResourceId}`)
        .then((r) => r.json())
        .then((r) => {
          setResources([r]);
          setSelectedShelfId(r.bin.shelf.id);
          setSelectedBinId(r.bin.id);
        })
        .catch(console.error);
    } else {
      setResources([]);
    }
  }, [selectedBinId, preselectedResourceId]);

  const selectedShelf = shelves.find((s) => s.id === selectedShelfId);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId || !selectedTeacherId) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/resource-checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: selectedResourceId, teacherId: selectedTeacherId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to check out" });
      } else {
        setMessage({
          type: "success",
          text: `✅ ${data.resource.name} checked out to ${data.teacher.name}!`,
        });
        setSelectedResourceId("");
        // Refresh resources list
        if (selectedBinId) {
          const raw = await fetch(`/api/resources?binId=${selectedBinId}`).then((r) => r.json());
          setResources(Array.isArray(raw) ? raw : raw?.resources ?? []);
        }
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">✅ Check Out Resource</h1>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleCheckout} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Select a teacher...</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resource Shelf</label>
          <select
            value={selectedShelfId}
            onChange={(e) => { setSelectedShelfId(e.target.value); setSelectedBinId(""); setSelectedResourceId(""); }}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Select a shelf...</option>
            {shelves.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {selectedShelf && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bin</label>
            <select
              value={selectedBinId}
              onChange={(e) => { setSelectedBinId(e.target.value); setSelectedResourceId(""); }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select a bin...</option>
              {selectedShelf.bins.map((b) => (
                <option key={b.id} value={b.id}>{b.label || `Bin ${b.number}`}</option>
              ))}
            </select>
          </div>
        )}

        {resources.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
            <div className="space-y-2">
              {resources.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedResourceId === r.id
                      ? "border-green-500 bg-green-50"
                      : r.availableQuantity > 0
                        ? "border-gray-200 hover:border-gray-300"
                        : "border-gray-200 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="resourceId"
                      value={r.id}
                      checked={selectedResourceId === r.id}
                      onChange={(e) => setSelectedResourceId(e.target.value)}
                      disabled={r.availableQuantity <= 0}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.resourceCategory.name}</div>
                    </div>
                  </div>
                  <span className={`text-sm px-2 py-0.5 rounded-full ${
                    r.availableQuantity > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {r.availableQuantity}/{r.quantity}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedResourceId || !selectedTeacherId}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
        >
          {loading ? "Checking out..." : "Check Out Resource"}
        </button>
      </form>
    </div>
  );
}

export default function ResourceCheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <ResourceCheckoutContent />
    </Suspense>
  );
}
