"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Teacher {
  id: string;
  name: string;
}

interface ScanResult {
  type: "success" | "error" | "warning";
  title: string;
  detail: string;
}

type Mode = "checkout" | "checkin";

export default function ScanStationPage() {
  const [mode, setMode] = useState<Mode>("checkout");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [recentActions, setRecentActions] = useState<ScanResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => r.json())
      .then(setTeachers)
      .catch(console.error);
  }, []);

  // Auto-focus input
  const refocus = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => { refocus(); }, [mode, refocus]);

  // USB barcode scanner: rapid keystrokes ending with Enter
  useEffect(() => {
    let buffer = "";
    let timeout: ReturnType<typeof setTimeout>;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't capture if user is in the select dropdown
      if ((e.target as HTMLElement)?.tagName === "SELECT") return;

      if (e.key === "Enter" && buffer.length >= 10) {
        const cleaned = buffer.replace(/[^0-9X]/gi, "");
        if (cleaned.length === 10 || cleaned.length === 13) {
          e.preventDefault();
          handleScan(cleaned);
          buffer = "";
          return;
        }
      }

      if (/[0-9X]/i.test(e.key)) {
        buffer += e.key;
      }

      clearTimeout(timeout);
      timeout = setTimeout(() => { buffer = ""; }, 100);
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      clearTimeout(timeout);
    };
  }, [mode, selectedTeacherId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScan = async (isbn: string) => {
    if (processing) return;
    if (mode === "checkout" && !selectedTeacherId) {
      setLastResult({ type: "warning", title: "Select a teacher first", detail: "Pick who is checking out before scanning." });
      return;
    }

    setProcessing(true);
    setLastResult(null);

    try {
      if (mode === "checkout") {
        const res = await fetch("/api/checkouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "BOOK", isbn, teacherId: selectedTeacherId }),
        });

        if (res.ok) {
          const data = await res.json();
          const bookTitle = data.book?.title || isbn;
          const teacherName = data.teacher?.name || "";
          const result: ScanResult = { type: "success", title: `✅ Checked out "${bookTitle}"`, detail: `to ${teacherName}` };
          setLastResult(result);
          setRecentActions((prev) => [result, ...prev.slice(0, 9)]);
        } else {
          const err = await res.json();
          setLastResult({ type: "error", title: "Checkout failed", detail: err.error || "Unknown error" });
        }
      } else {
        // Check in by ISBN
        const res = await fetch("/api/checkouts/return", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isbn }),
        });

        if (res.ok) {
          const data = await res.json();
          const bookTitle = data.book?.title || isbn;
          const teacherName = data.teacher?.name || "";
          const result: ScanResult = { type: "success", title: `📥 Returned "${bookTitle}"`, detail: `from ${teacherName}` };
          setLastResult(result);
          setRecentActions((prev) => [result, ...prev.slice(0, 9)]);
        } else {
          const err = await res.json();
          setLastResult({ type: "error", title: "Return failed", detail: err.error || "Unknown error" });
        }
      }
    } catch {
      setLastResult({ type: "error", title: "Something went wrong", detail: "Check your connection and try again." });
    } finally {
      setProcessing(false);
      setScanInput("");
      refocus();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = scanInput.replace(/[^0-9X]/gi, "");
    if (cleaned.length >= 10) {
      handleScan(cleaned);
    }
  };

  const resultColors = {
    success: "bg-green-50 border-green-300 text-green-800",
    error: "bg-red-50 border-red-300 text-red-800",
    warning: "bg-amber-50 border-amber-300 text-amber-800",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">📡 Scan Station</h1>
        <p className="text-gray-500 mt-1">Scan book barcodes to check out or return</p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border-2 border-gray-200">
        <button
          onClick={() => { setMode("checkout"); setLastResult(null); }}
          className={`flex-1 py-4 text-lg font-bold transition-colors ${
            mode === "checkout"
              ? "bg-green-600 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          📖 Check Out
        </button>
        <button
          onClick={() => { setMode("checkin"); setLastResult(null); }}
          className={`flex-1 py-4 text-lg font-bold transition-colors ${
            mode === "checkin"
              ? "bg-purple-600 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          📥 Return
        </button>
      </div>

      {/* Teacher picker for checkout mode */}
      {mode === "checkout" && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-green-800 mb-2">
            👋 Who is checking out?
          </label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full px-4 py-3 border border-green-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Select teacher…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Scan input */}
      <form onSubmit={handleManualSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          placeholder={processing ? "Processing…" : "Scan barcode or type ISBN…"}
          disabled={processing}
          autoFocus
          className={`w-full px-6 py-5 text-xl border-2 rounded-xl focus:outline-none focus:ring-4 transition-all ${
            mode === "checkout"
              ? "border-green-300 focus:ring-green-200 focus:border-green-500"
              : "border-purple-300 focus:ring-purple-200 focus:border-purple-500"
          } disabled:opacity-50`}
        />
        {processing && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </form>

      {/* Last result - big feedback */}
      {lastResult && (
        <div className={`border-2 rounded-xl p-6 text-center animate-in ${resultColors[lastResult.type]}`}>
          <div className="text-2xl font-bold">{lastResult.title}</div>
          <div className="text-lg mt-1 opacity-80">{lastResult.detail}</div>
        </div>
      )}

      {/* Ready indicator when no result */}
      {!lastResult && !processing && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-5xl mb-3">{mode === "checkout" ? "📖" : "📥"}</div>
          <p className="text-lg">
            {mode === "checkout"
              ? selectedTeacherId
                ? "Ready to scan — point barcode at scanner"
                : "Select a teacher above, then scan"
              : "Ready — scan a book barcode to return it"}
          </p>
        </div>
      )}

      {/* Recent actions log */}
      {recentActions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Recent ({recentActions.length})
          </h2>
          <div className="space-y-1">
            {recentActions.map((action, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm ${
                  action.type === "success" ? "bg-gray-50 text-gray-700" : "bg-red-50 text-red-700"
                }`}
              >
                <span className="font-medium truncate">{action.title}</span>
                <span className="text-xs opacity-60 ml-2 flex-shrink-0">{action.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
