"use client";

import { useEffect, useState } from "react";

interface Submission {
  id: string;
  isbn: string | null;
  title: string;
  author: string;
  coverImageUrl: string | null;
  totalCopies: number;
  notes: string | null;
  status: string;
  rejectReason: string | null;
  teacher: { id: string; name: string };
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Approval form state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Reject form state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = async () => {
    try {
      const [subsRes, shelvesRes] = await Promise.all([
        fetch(`/api/submissions?status=${filter}`),
        fetch("/api/shelves"),
      ]);
      const subs = await subsRes.json();
      const shelves = await shelvesRes.json();

      setSubmissions(subs);

      // Extract categories from shelves
      const cats = new Map<string, string>();
      for (const shelf of shelves) {
        for (const section of shelf.sections) {
          if (section.category) {
            cats.set(section.category.id, section.category.name);
          }
        }
      }
      setCategories(
        Array.from(cats.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [filter]);

  const handleApprove = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          categoryId: selectedCategoryId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: `"${data.submission.title}" approved and added to the library!` });
        setApprovingId(null);
        setSelectedCategoryId("");
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Approval failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    }
  };

  const handleReject = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectReason: rejectReason || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: `"${data.submission.title}" has been rejected.` });
        setRejectingId(null);
        setRejectReason("");
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Rejection failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">📋 Book Submissions</h1>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              filter === s
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No {filter} submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div key={sub.id} className="bg-white border rounded-xl p-5">
              <div className="flex gap-4">
                {/* Cover */}
                <div className="w-16 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                  {sub.coverImageUrl ? (
                    <img src={sub.coverImageUrl} alt={sub.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📕</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{sub.title}</h3>
                  <p className="text-sm text-gray-600">{sub.author}</p>
                  {sub.isbn && <p className="text-xs text-gray-400">ISBN: {sub.isbn}</p>}

                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {sub.totalCopies} {sub.totalCopies === 1 ? "copy" : "copies"}
                    </span>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      Submitted by {sub.teacher.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {sub.notes && (
                    <p className="text-sm text-gray-500 mt-2 italic">&ldquo;{sub.notes}&rdquo;</p>
                  )}

                  {sub.status === "rejected" && sub.rejectReason && (
                    <p className="text-sm text-red-600 mt-2">Reason: {sub.rejectReason}</p>
                  )}
                </div>
              </div>

              {/* Actions for pending */}
              {sub.status === "pending" && (
                <div className="mt-4 pt-4 border-t">
                  {approvingId === sub.id ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-green-800">Assign a category before approving:</p>
                      <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">No category (assign later)</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(sub.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          ✓ Confirm Approval
                        </button>
                        <button
                          onClick={() => { setApprovingId(null); setSelectedCategoryId(""); }}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : rejectingId === sub.id ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-red-800">Reason for rejection (optional):</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="e.g., We already have this book..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(sub.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          ✗ Confirm Rejection
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(""); }}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setApprovingId(sub.id); setRejectingId(null); }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => { setRejectingId(sub.id); setApprovingId(null); }}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
