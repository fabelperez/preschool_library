"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/components/RoleProvider";

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
}

interface Shelf {
  id: string;
  name: string;
  type: string;
  bins: { id: string; number: number; label: string | null }[];
}

interface ResourceCheckoutFormProps {
  teachers: Teacher[];
}

export default function ResourceCheckoutForm({
  teachers,
}: ResourceCheckoutFormProps) {
  const { role, teacherId: sessionTeacherId, teacherName: sessionTeacherName } = useRole();
  const isTeacherLocked = role === "teacher" && !!sessionTeacherId;

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedShelfId, setSelectedShelfId] = useState("");
  const [selectedBinId, setSelectedBinId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Lock teacher when in teacher mode
  useEffect(() => {
    if (isTeacherLocked) {
      setSelectedTeacherId(sessionTeacherId);
    }
  }, [isTeacherLocked, sessionTeacherId]);

  useEffect(() => {
    fetch("/api/shelves")
      .then((r) => r.json())
      .then((s: Shelf[]) =>
        setShelves(s.filter((shelf) => shelf.type === "resource"))
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedBinId) {
      fetch(`/api/resources?binId=${selectedBinId}`)
        .then((r) => r.json())
        .then(setResources)
        .catch(console.error);
    } else {
      setResources([]);
    }
  }, [selectedBinId]);

  const selectedShelf = shelves.find((s) => s.id === selectedShelfId);

  const handleCheckout = async () => {
    if (!selectedResourceId || !selectedTeacherId) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/resource-checkouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: selectedResourceId,
          teacherId: selectedTeacherId,
        }),
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
        if (selectedBinId) {
          const updated = await fetch(
            `/api/resources?binId=${selectedBinId}`
          ).then((r) => r.json());
          setResources(updated);
        }
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`p-4 rounded-lg border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Step 1: Find the resource */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h2 className="font-semibold text-amber-800 mb-3">
          Step 1: Find the Resource
        </h2>
        <div className="space-y-3">
          <select
            value={selectedShelfId}
            onChange={(e) => {
              setSelectedShelfId(e.target.value);
              setSelectedBinId("");
              setSelectedResourceId("");
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select a resource shelf...</option>
            {shelves.map((s) => (
              <option key={s.id} value={s.id}>
                🗄️ {s.name}
              </option>
            ))}
          </select>

          {selectedShelf && (
            <select
              value={selectedBinId}
              onChange={(e) => {
                setSelectedBinId(e.target.value);
                setSelectedResourceId("");
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select a bin...</option>
              {selectedShelf.bins.map((b) => (
                <option key={b.id} value={b.id}>
                  📦 {b.label || `Bin ${b.number}`}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Step 2: Pick resource */}
      {resources.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h2 className="font-semibold text-blue-800 mb-3">
            Step 2: Pick a Resource
          </h2>
          <div className="space-y-2">
            {resources.map((r) => (
              <label
                key={r.id}
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedResourceId === r.id
                    ? "border-green-500 bg-green-50"
                    : r.availableQuantity > 0
                      ? "border-gray-200 hover:border-gray-300 bg-white"
                      : "border-gray-200 opacity-50 cursor-not-allowed bg-white"
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
                    <div className="text-xs text-gray-500">
                      {r.resourceCategory.name}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-sm px-2 py-0.5 rounded-full ${
                    r.availableQuantity > 0
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {r.availableQuantity}/{r.quantity} available
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Who's checking out? */}
      {selectedResourceId && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="font-semibold text-green-800 mb-3">
            Step 3: Who&apos;s Checking Out?
          </h2>
          {isTeacherLocked ? (
            <p className="text-green-700 font-medium">👋 Checking out as {sessionTeacherName}</p>
          ) : (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a teacher...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Checkout button */}
      {selectedResourceId && selectedTeacherId && (
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg disabled:opacity-50"
        >
          {loading ? "Processing..." : "Check Out Resource 📦"}
        </button>
      )}
    </div>
  );
}
