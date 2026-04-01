"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";

interface CheckoutItem {
  id: string;
  type: string;
  checkedOutAt: string;
  book: { title: string } | null;
  resourceCategoryId: string | null;
}

interface Teacher {
  id: string;
  name: string;
  email: string | null;
  checkouts: CheckoutItem[];
}

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-rose-500", "bg-emerald-500", "bg-amber-500",
  "bg-cyan-500", "bg-purple-500", "bg-pink-500", "bg-teal-500",
];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ManageTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTeachers = () => {
    fetch("/api/teachers")
      .then((r) => r.json())
      .then(setTeachers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const res = await fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail || null }),
    });

    if (res.ok) {
      setMessage({ type: "success", text: `${newName} added!` });
      setNewName("");
      setNewEmail("");
      setShowAddForm(false);
      fetchTeachers();
    } else {
      const err = await res.json();
      setMessage({ type: "error", text: err.error || "Failed to add teacher" });
    }
  };

  const filtered = searchQuery
    ? teachers.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : teachers;

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <AdminHeader
        icon="👩‍🏫"
        title="Manage Teachers"
        description={`${teachers.length} teacher${teachers.length !== 1 ? "s" : ""} registered`}
        action={
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            {showAddForm ? "Cancel" : "+ Add Teacher"}
          </button>
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
        <form onSubmit={handleAdd} className="bg-gray-50 border rounded-xl p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="e.g., Ms. Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g., smith@school.edu"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Add Teacher
          </button>
        </form>
      )}

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="🔍 Search teachers by name or email..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      />

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12 bg-gray-50 rounded-lg">
          {searchQuery ? "No teachers match your search." : "No teachers yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((teacher) => {
            const activeCheckouts = teacher.checkouts.filter((c) => c.type === "BOOK" && c.book);
            const themeCheckouts = teacher.checkouts.filter((c) => c.type === "THEME");
            const totalActive = teacher.checkouts.length;
            const isExpanded = expandedId === teacher.id;

            return (
              <div key={teacher.id} className="bg-white border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : teacher.id)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getAvatarColor(teacher.name)}`}>
                    {getInitials(teacher.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{teacher.name}</div>
                    {teacher.email && <div className="text-sm text-gray-400 truncate">{teacher.email}</div>}
                  </div>

                  {/* Checkout badge */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {totalActive > 0 ? (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                        {totalActive} checked out
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                        All clear
                      </span>
                    )}
                    <span className="text-gray-400 text-sm">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {/* Expanded checkout details */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 px-4 py-3">
                    {totalActive === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">No active checkouts</p>
                    ) : (
                      <div className="space-y-2">
                        {themeCheckouts.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Themes</div>
                            {themeCheckouts.map((co) => (
                              <div key={co.id} className="flex items-center gap-2 text-sm py-1">
                                <span>🎨</span>
                                <span className="text-gray-700">Theme checkout</span>
                                <span className="text-gray-400 text-xs ml-auto">
                                  {new Date(co.checkedOutAt).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {activeCheckouts.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Books</div>
                            {activeCheckouts.map((co) => (
                              <div key={co.id} className="flex items-center gap-2 text-sm py-1">
                                <span>📖</span>
                                <span className="text-gray-700 truncate">{co.book?.title}</span>
                                <span className="text-gray-400 text-xs ml-auto flex-shrink-0">
                                  {new Date(co.checkedOutAt).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
