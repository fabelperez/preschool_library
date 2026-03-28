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

interface FixtureLayout {
  id: string;
  type: string;
  label: string;
  emoji: string;
  layoutX: number;
  layoutY: number;
  layoutWidth: number;
  layoutHeight: number;
  layoutRotation: number;
  borderStyle: string;
  bgColor: string;
}

type SelectedItem = { kind: "shelf" | "fixture"; id: string } | null;

const FIXTURE_PRESETS = [
  { label: "Door", emoji: "🚪", type: "door", bgColor: "bg-amber-700/30", borderStyle: "solid", layoutWidth: 12, layoutHeight: 18 },
  { label: "Window", emoji: "🪟", type: "window", bgColor: "bg-sky-200/50", borderStyle: "solid", layoutWidth: 18, layoutHeight: 12 },
  { label: "Reading Area", emoji: "📖", type: "rug", bgColor: "bg-indigo-100/50", borderStyle: "dashed", layoutWidth: 30, layoutHeight: 20 },
  { label: "Table", emoji: "🪑", type: "custom", bgColor: "bg-orange-100/50", borderStyle: "solid", layoutWidth: 15, layoutHeight: 10 },
  { label: "Desk", emoji: "🖥️", type: "custom", bgColor: "bg-slate-100/50", borderStyle: "solid", layoutWidth: 18, layoutHeight: 10 },
  { label: "Rug", emoji: "🟫", type: "rug", bgColor: "bg-rose-100/50", borderStyle: "dashed", layoutWidth: 25, layoutHeight: 18 },
];

export default function ShelfLayoutEditorPage() {
  const [shelves, setShelves] = useState<ShelfLayout[]>([]);
  const [fixtures, setFixtures] = useState<FixtureLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const roomRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [shelvesRes, fixturesRes] = await Promise.all([
        fetch("/api/shelves"),
        fetch("/api/room-fixtures"),
      ]);
      const shelvesData = await shelvesRes.json();
      const fixturesData = await fixturesRes.json();
      setShelves(
        shelvesData.map((s: ShelfLayout) => ({
          id: s.id, name: s.name,
          layoutX: s.layoutX, layoutY: s.layoutY,
          layoutWidth: s.layoutWidth, layoutHeight: s.layoutHeight,
          layoutRotation: s.layoutRotation,
        }))
      );
      setFixtures(fixturesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const updateFixture = useCallback((id: string, updates: Partial<FixtureLayout>) => {
    setFixtures((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const [shelfRes, fixtureRes] = await Promise.all([
        fetch("/api/shelves/layout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shelves }),
        }),
        fetch("/api/room-fixtures/layout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fixtures }),
        }),
      ]);
      if (shelfRes.ok && fixtureRes.ok) {
        setMessage({ type: "success", text: "Layout saved!" });
        setDirty(false);
      } else {
        setMessage({ type: "error", text: "Failed to save layout" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddShelf = async () => {
    try {
      const res = await fetch("/api/shelves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Shelf ${String.fromCharCode(65 + shelves.length)}`,
          position: shelves.length + 1,
          layoutX: 10, layoutY: 10, layoutWidth: 25, layoutHeight: 14,
        }),
      });
      if (res.ok) {
        const newShelf = await res.json();
        setShelves((prev) => [...prev, {
          id: newShelf.id, name: newShelf.name,
          layoutX: newShelf.layoutX, layoutY: newShelf.layoutY,
          layoutWidth: newShelf.layoutWidth, layoutHeight: newShelf.layoutHeight,
          layoutRotation: newShelf.layoutRotation,
        }]);
        setSelected({ kind: "shelf", id: newShelf.id });
        setMessage({ type: "success", text: `Added "${newShelf.name}" — drag it into position!` });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to add shelf" });
    }
    setShowAddMenu(false);
  };

  const handleAddFixture = async (preset: typeof FIXTURE_PRESETS[0]) => {
    try {
      const res = await fetch("/api/room-fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...preset,
          layoutX: 10, layoutY: 10,
        }),
      });
      if (res.ok) {
        const newFixture = await res.json();
        setFixtures((prev) => [...prev, newFixture]);
        setSelected({ kind: "fixture", id: newFixture.id });
        setMessage({ type: "success", text: `Added "${preset.label}" — drag it into position!` });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to add fixture" });
    }
    setShowAddMenu(false);
  };

  const handleDeleteSelected = async () => {
    if (!selected) return;
    const label = selected.kind === "shelf"
      ? shelves.find((s) => s.id === selected.id)?.name
      : fixtures.find((f) => f.id === selected.id)?.label;
    if (!confirm(`Delete "${label}"?`)) return;

    try {
      if (selected.kind === "shelf") {
        await fetch(`/api/shelves/${selected.id}`, { method: "DELETE" });
        setShelves((prev) => prev.filter((s) => s.id !== selected.id));
      } else {
        await fetch(`/api/room-fixtures?id=${selected.id}`, { method: "DELETE" });
        setFixtures((prev) => prev.filter((f) => f.id !== selected.id));
      }
      setSelected(null);
      setMessage({ type: "success", text: `Deleted "${label}"` });
    } catch {
      setMessage({ type: "error", text: "Failed to delete" });
    }
  };

  const handleRotationChange = (rotation: number) => {
    if (!selected) return;
    if (selected.kind === "shelf") updateShelf(selected.id, { layoutRotation: rotation });
    else updateFixture(selected.id, { layoutRotation: rotation });
  };

  const selectedItem = selected
    ? selected.kind === "shelf"
      ? shelves.find((s) => s.id === selected.id)
      : fixtures.find((f) => f.id === selected.id)
    : null;

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📐 Room Layout Editor</h1>
          <p className="text-sm text-gray-500 mt-1">Drag items to reposition. Resize by dragging edges. Click to select and adjust rotation.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              + Add Item
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg z-30 w-56 overflow-hidden">
                <button
                  onClick={handleAddShelf}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 text-sm font-medium text-indigo-700 border-b"
                >
                  🗄️ New Shelf
                </button>
                <div className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider">Room Fixtures</div>
                {FIXTURE_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handleAddFixture(preset)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
                  >
                    {preset.emoji} {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link href="/admin/shelves" className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
            ← Shelves
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
        onClick={() => { setSelected(null); setShowAddMenu(false); }}
      >
        {/* Floor trim */}
        <div className="absolute bottom-0 left-0 right-0 h-[8%] bg-amber-800/20 border-t border-amber-900/30 pointer-events-none" />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-stone-400 font-medium tracking-wider uppercase pointer-events-none">
          Library Room
        </div>

        {/* Draggable fixtures */}
        {fixtures.map((fixture) => {
          const { x, y, width, height } = pctToPx(fixture.layoutX, fixture.layoutY, fixture.layoutWidth, fixture.layoutHeight);
          const isSelected = selected?.kind === "fixture" && selected.id === fixture.id;
          const isRound = fixture.type === "rug";

          return (
            <Rnd
              key={fixture.id}
              position={{ x, y }}
              size={{ width, height }}
              bounds="parent"
              minWidth={30}
              minHeight={20}
              onDragStart={(e) => {
                e.stopPropagation();
                setSelected({ kind: "fixture", id: fixture.id });
              }}
              onDragStop={(_e, d) => {
                const pct = pxToPct(d.x, d.y, width, height);
                updateFixture(fixture.id, { layoutX: pct.layoutX, layoutY: pct.layoutY });
              }}
              onResizeStop={(_e, _dir, ref, _delta, position) => {
                const pct = pxToPct(position.x, position.y, ref.offsetWidth, ref.offsetHeight);
                updateFixture(fixture.id, pct);
              }}
              className={`z-[5] ${isSelected ? "z-20" : ""}`}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(isSelected ? null : { kind: "fixture", id: fixture.id });
                }}
                style={{ transform: fixture.layoutRotation ? `rotate(${fixture.layoutRotation}deg)` : undefined }}
                className={`w-full h-full flex items-center justify-center cursor-move transition-all
                  ${isRound ? "rounded-full" : "rounded-lg"}
                  ${fixture.bgColor}
                  border-2 ${fixture.borderStyle === "dashed" ? "border-dashed" : "border-solid"}
                  ${isSelected
                    ? "border-indigo-500 ring-2 ring-indigo-300 shadow-lg"
                    : "border-gray-300/60 hover:border-gray-400"
                  }`}
              >
                <div className="text-center pointer-events-none">
                  <span className="text-lg">{fixture.emoji}</span>
                  <div className="text-[9px] text-gray-500 leading-tight">{fixture.label}</div>
                </div>
              </div>
            </Rnd>
          );
        })}

        {/* Draggable shelves */}
        {shelves.map((shelf) => {
          const { x, y, width, height } = pctToPx(shelf.layoutX, shelf.layoutY, shelf.layoutWidth, shelf.layoutHeight);
          const isSelected = selected?.kind === "shelf" && selected.id === shelf.id;

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
                setSelected({ kind: "shelf", id: shelf.id });
              }}
              onDragStop={(_e, d) => {
                const pct = pxToPct(d.x, d.y, width, height);
                updateShelf(shelf.id, { layoutX: pct.layoutX, layoutY: pct.layoutY });
              }}
              onResizeStop={(_e, _dir, ref, _delta, position) => {
                const pct = pxToPct(position.x, position.y, ref.offsetWidth, ref.offsetHeight);
                updateShelf(shelf.id, pct);
              }}
              className={`z-10 ${isSelected ? "z-20" : ""}`}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(isSelected ? null : { kind: "shelf", id: shelf.id });
                }}
                style={{ transform: shelf.layoutRotation ? `rotate(${shelf.layoutRotation}deg)` : undefined }}
                className={`w-full h-full rounded-lg border-2 flex flex-col items-center justify-center cursor-move transition-colors
                  ${isSelected
                    ? "bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300 shadow-lg"
                    : "bg-amber-100 border-amber-400 hover:border-amber-500 shadow-md"
                  }`}
              >
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

      {/* Controls for selected item */}
      {selected && selectedItem && (
        <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-800">
              {selected.kind === "shelf" ? "🗄️" : (selectedItem as FixtureLayout).emoji || "📦"}{" "}
              {"name" in selectedItem ? selectedItem.name : (selectedItem as FixtureLayout).label}
            </span>
            <button
              onClick={handleDeleteSelected}
              className="text-sm text-red-500 hover:text-red-700 px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50"
            >
              🗑️ Delete
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">🔄 Rotation</span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={selectedItem.layoutRotation ?? 0}
              onChange={(e) => handleRotationChange(Number(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-sm text-gray-500 w-12 text-right">
              {selectedItem.layoutRotation ?? 0}°
            </span>
            <button
              onClick={() => handleRotationChange(0)}
              className="text-xs text-indigo-600 hover:underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Item list */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Shelves</h3>
        {shelves.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No shelves yet — use &ldquo;+ Add Item&rdquo; above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {shelves.map((shelf) => (
              <button
                key={shelf.id}
                onClick={() => setSelected({ kind: "shelf", id: shelf.id })}
                className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                  selected?.kind === "shelf" && selected.id === shelf.id
                    ? "bg-indigo-50 border-indigo-300"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-800">🗄️ {shelf.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {shelf.layoutX.toFixed(1)}%, {shelf.layoutY.toFixed(1)}% · {shelf.layoutWidth.toFixed(1)}% × {shelf.layoutHeight.toFixed(1)}%
                </div>
              </button>
            ))}
          </div>
        )}

        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mt-4">Room Fixtures</h3>
        {fixtures.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No fixtures yet — use &ldquo;+ Add Item&rdquo; above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {fixtures.map((fixture) => (
              <button
                key={fixture.id}
                onClick={() => setSelected({ kind: "fixture", id: fixture.id })}
                className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                  selected?.kind === "fixture" && selected.id === fixture.id
                    ? "bg-indigo-50 border-indigo-300"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-gray-800">{fixture.emoji} {fixture.label}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {fixture.layoutX.toFixed(1)}%, {fixture.layoutY.toFixed(1)}% · {fixture.layoutWidth.toFixed(1)}% × {fixture.layoutHeight.toFixed(1)}%
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
