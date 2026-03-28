"use client";

import { useEffect, useState } from "react";

interface Checkout {
  book: { title: string };
}

interface Teacher {
  id: string;
  name: string;
  email: string | null;
  checkouts: Checkout[];
}

export default function ManageTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
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

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">👩‍🏫 Manage Teachers</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          {showAddForm ? "Cancel" : "+ Add Teacher"}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-gray-50 border rounded-xl p-5 space-y-4">
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
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Add Teacher
          </button>
        </form>
      )}

      {teachers.length === 0 ? (
        <p className="text-gray-500 text-center py-12 bg-gray-50 rounded-lg">No teachers yet.</p>
      ) : (
        <div className="space-y-2">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="flex justify-between items-center bg-white border rounded-lg p-4">
              <div>
                <div className="font-medium">{teacher.name}</div>
                {teacher.email && <div className="text-sm text-gray-500">{teacher.email}</div>}
              </div>
              <div className="text-sm text-gray-500">
                {teacher.checkouts.length > 0 ? (
                  <span className="text-amber-600">{teacher.checkouts.length} book(s) checked out</span>
                ) : (
                  <span className="text-green-600">No checkouts</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
