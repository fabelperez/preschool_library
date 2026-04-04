"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";

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
  const toast = useToast();
  const [checkouts, setCheckouts] = useState<ActiveCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);

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

    try {
      const res = await fetch("/api/resource-checkouts/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to return");
      } else {
        toast.success(`✅ ${data.resource.name} returned by ${data.teacher.name}!`);
        fetchCheckouts();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setReturning(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">↩️ Return Resources</h1>

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
