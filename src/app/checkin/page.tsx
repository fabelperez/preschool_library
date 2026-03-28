"use client";

import { useState, useEffect } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";

interface ActiveCheckout {
  id: string;
  checkedOutAt: string;
  book: { id: string; title: string; author: string; isbn: string | null; category: { name: string } | null };
  teacher: { name: string };
}

export default function CheckinPage() {
  const [checkouts, setCheckouts] = useState<ActiveCheckout[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCheckouts = () => {
    fetch("/api/checkouts")
      .then((r) => r.json())
      .then(setCheckouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCheckouts(); }, []);

  const handleScan = async (isbn: string) => {
    setMessage(null);
    try {
      const res = await fetch("/api/checkouts/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: `"${data.book.title}" returned by ${data.teacher.name}!` });
        fetchCheckouts();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Return failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    }
  };

  const handleReturnById = async (checkoutId: string) => {
    try {
      const res = await fetch("/api/checkouts/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: `"${data.book.title}" returned by ${data.teacher.name}!` });
        fetchCheckouts();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Return failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">↩️ Check In a Book</h1>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <h2 className="font-semibold text-purple-800 mb-3">Scan Book Barcode to Return</h2>
        <BarcodeScanner onScan={handleScan} placeholder="Scan ISBN to check in..." />
      </div>

      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Currently Checked Out ({checkouts.length})</h2>
        
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : checkouts.length === 0 ? (
          <p className="text-gray-500 bg-gray-50 rounded-lg p-6 text-center">All books are returned! 🎉</p>
        ) : (
          <div className="space-y-2">
            {checkouts.map((co) => (
              <div key={co.id} className="flex justify-between items-center bg-white border rounded-lg p-4">
                <div>
                  <div className="font-medium">{co.book.title}</div>
                  <div className="text-sm text-gray-500">
                    by {co.book.author} • Checked out by <span className="font-medium">{co.teacher.name}</span> on{" "}
                    {new Date(co.checkedOutAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleReturnById(co.id)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm whitespace-nowrap"
                >
                  Return
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
