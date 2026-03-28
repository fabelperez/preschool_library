"use client";

import { useEffect, useState } from "react";

interface ActiveCheckout {
  id: string;
  checkedOutAt: string;
  resource: {
    id: string;
    name: string;
    resourceCategory: { name: string };
    bin: {
      number: number;
      label: string | null;
      shelf: { name: string };
    };
  };
  teacher: { id: string; name: string };
}

export default function ResourceCheckinPage() {
  const [checkouts, setCheckouts] = useState<ActiveCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCheckouts = () => {
    setLoading(true);
    fetch("/api/resource-checkouts")
      .then((r) => r.json())
      .then(setCheckouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCheckouts(); }, []);

  const handleReturn = async (checkoutId: string) => {
    setReturning(checkoutId);
    setMessage(null);

    try {
      const res = await fetch("/api/resource-checkouts/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to return" });
      } else {
        setMessage({
          type: "success",
          text: `✅ ${data.resource.name} returned by ${data.teacher.name}!`,
        });
        fetchCheckouts();
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setReturning(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">↩️ Return Resources</h1>

      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading active checkouts...</div>
      ) : checkouts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No resources currently checked out.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {checkouts.map((co) => (
            <div key={co.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{co.resource.name}</h3>
                <div className="text-sm text-gray-500 mt-1">
                  {co.resource.bin.shelf.name} → {co.resource.bin.label || `Bin ${co.resource.bin.number}`} → {co.resource.resourceCategory.name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Checked out by <span className="font-medium">{co.teacher.name}</span> on{" "}
                  {new Date(co.checkedOutAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleReturn(co.id)}
                disabled={returning === co.id}
                className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-sm font-medium disabled:opacity-50 flex-shrink-0"
              >
                {returning === co.id ? "Returning..." : "Return"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
