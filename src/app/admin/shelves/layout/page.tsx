"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Rnd } from "react-rnd";
import Link from "next/link";

interface ShelfLayout {
  id: string;
  name: string;
  layoutX: number;
  layoutY: number;
  layoutWidth: number;
  layoutHeight: number;
  layoutRotation: number;
}

export default function ShelfLayoutEditorPage() {
  const [shelves, setShelves] = useState<ShelfLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const roomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/shelves")
      .then((r) => r.json())
      .then((data) => {
        setShelves(
          data.map((s: ShelfLayout) => ({
            id: s.id,
            name: s.name,
            layoutX: s.layoutX,
            layoutY: s.layoutY,
            layoutWidth: s.layoutWidth,
            layoutHeight: s.layoutHeight,
            layoutRotation: s.layoutRotation,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getRoomSize = useCallback(() => {
    if (!roomRef.current) return { w: 800, h: 440 };
    return { w: roomRef.current.offsetWidth, h: roomRef.current.offsetHeight };
  }, []);

  const pctToPx = useCallback(
    (xPct: number, yPct: number, wPct: number, hPct: number) => {
      const { w, h } = getRoomSize();
      return { x: (xPct / 100) * w, y: (yPct / 100) * h, width: (wPct / 100) * w, height: (hPct / 100) * h };
    },
    [getRoomSize]
  );

  const pxToPct = useCallback(
    (xPx: number, yPx: number, wPx: number, hPx: number) => {
      const { w, h } = getRoomSize();
      return {
        layoutX: Math.round((xPx / w) * 1000) / 10,
        layoutY: Math.round((yPx / h) * 1000) / 10,
        layoutWidth: Math.round((wPx / w) * 1000) / 10,
        layoutHeight: Math.round((hPx / h) * 1000) / 10,
      };
    },
    [getRoomSize]
  );

  const updateShelf = useCallback((id: string, updates: Partial<ShelfLayout>) => {
    setShelves((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/shelves/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelves }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Layout saved!" });
        setDirty(false);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  const handleRotationChange = (id: string, rotation: number) => {
    updateShelf(id, { layoutRotation: rotation });
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📐 Room Layout Editor</h1>
          <p className="text-sm text-gray-500 mt-1">Drag shelves to reposition. Resize by dragging edges. Click a shelf to adjust rotation.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/shelves" className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
            ← Back to Shelves
          </Link>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              dirty
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving..." : "Save Layout"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {dirty && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          ⚠️ You have unsaved changes
        </div>
      )}

      {/* Room canvas */}
      <div
        ref={roomRef}
        className="relative bg-gradient-to-b from-sky-50 to-amber-50 border-2 border-stone-400 rounded-2xl overflow-hidden select-none"
        style={{ paddingBottom: "55%" }}
        onClick={() => setSelectedId(null)}
      >
        {/* Room decorations */}
        <div className="absolute bottom-0 left-0 right-0 h-[8%] bg-amber-800/20 border-t border-amber-900/30" />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-stone-400 font-medium tracking-wider uppercase pointer-events-none">
          Library Room
        </div>

        {/* Door */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[12%] h-[18%] bg-amber-700/30 border-2 border-amber-900/40 rounded-t-lg flex items-center justify-center pointer-events-none">
          <span className="text-xs text-amber-900/60">🚪</span>
        </div>

        {/* Window */}
        <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[18%] h-[15%] bg-sky-200/50 border-2 border-sky-300 rounded-lg flex items-center justify-center pointer-events-none">
          <span className="text-lg">🪟</span>
        </div>

        {/* Reading area */}
        <div className="absolute top-[45%] left-[32%] w-[36%] h-[22%] bg-indigo-100/50 border-2 border-dashed border-indigo-200 rounded-full flex items-center justify-center pointer-events-none">
          <span className="text-xs text-indigo-400">📖 Reading Area</span>
        </div>

        {/* Draggable/resizable shelves */}
        {shelves.map((shelf) => {
          const { x, y, width, height } = pctToPx(shelf.layoutX, shelf.layoutY, shelf.layoutWidth, shelf.layoutHeight);
          const isSelected = selectedId === shelf.id;

          return (
            <Rnd
              key={shelf.id}
              position={{ x, y }}
              size={{ width, height }}
              bounds="parent"
              minWidth={40}
              minHeight={30}
              onDragStart={(e) => {
                e.stopPropagation();
                setSelectedId(shelf.id);
              }}
              onDragStop={(_e, d) => {
                const pct = pxToPct(d.x, d.y, width, height);
                updateShelf(shelf.id, { layoutX: pct.layoutX, layoutY: pct.layoutY });
              }}
              onResizeStop={(_e, _dir, ref, _delta, position) => {
                const pct = pxToPct(position.x, position.y, ref.offsetWidth, ref.offsetHeight);
                updateShelf(shelf.id, pct);
              }}
              style={{ transform: `rotate(${shelf.layoutRotation}deg)` }}
              className={`z-10 ${isSelected ? "z-20" : ""}`}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(isSelected ? null : shelf.id);
                }}
                className={`w-full h-full rounded-lg border-2 flex flex-col items-center justify-center cursor-move transition-colors
                  ${isSelected
                    ? "bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300 shadow-lg"
                    : "bg-amber-100 border-amber-400 hover:border-amber-500 shadow-md"
                  }`}
              >
                {/* Shelf visual lines */}
                <div className="absolute inset-x-2 top-[30%] border-t border-current opacity-10" />
                <div className="absolute inset-x-2 top-[60%] border-t border-current opacity-10" />

                <span className="font-bold text-xs md:text-sm text-amber-900 truncate w-full text-center px-1 leading-tight">
                  {shelf.name}
                </span>
                <span className="text-[9px] text-amber-700 opacity-60">
                  {Math.round(shelf.layoutWidth)}% × {Math.round(shelf.layoutHeight)}%
                </span>
              </div>
            </Rnd>
          );
        })}
      </div>

      {/* Rotation control for selected shelf */}
      {selectedId && (
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700 text-sm">
              🔄 Rotation: {shelves.find((s) => s.id === selectedId)?.name}
            </span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={shelves.find((s) => s.id === selectedId)?.layoutRotation ?? 0}
              onChange={(e) => handleRotationChange(selectedId, Number(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-sm text-gray-500 w-12 text-right">
              {shelves.find((s) => s.id === selectedId)?.layoutRotation ?? 0}°
            </span>
            <button
              onClick={() => handleRotationChange(selectedId, 0)}
              className="text-xs text-indigo-600 hover:underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Shelf list summary */}
      {shelves.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          No shelves to arrange. <Link href="/admin/shelves" className="text-indigo-600 hover:underline">Add shelves first</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {shelves.map((shelf) => (
            <button
              key={shelf.id}
              onClick={() => setSelectedId(shelf.id)}
              className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                selectedId === shelf.id
                  ? "bg-indigo-50 border-indigo-300"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-800">{shelf.name}</div>
              <div className="text-xs text-gray-400 mt-1">
                pos: {shelf.layoutX.toFixed(1)}%, {shelf.layoutY.toFixed(1)}% · size: {shelf.layoutWidth.toFixed(1)}% × {shelf.layoutHeight.toFixed(1)}%
                {shelf.layoutRotation !== 0 && ` · ${shelf.layoutRotation}°`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
