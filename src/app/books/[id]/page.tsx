"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import { useConfirm } from "@/hooks/useConfirm";

interface Checkout {
  id: string;
  checkedOutAt: string;
  returnedAt: string | null;
  teacher: { id: string; name: string };
}

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverImageUrl: string | null;
  totalCopies: number;
  availableCopies: number;
  status: string;
  statusNote: string | null;
  createdAt: string;
  category: { id: string; name: string } | null;
  qualifier: { id: string; name: string } | null;
  bin: { id: string; number: number; label: string | null; shelf: { id: string; name: string } } | null;
  resource: {
    id: string;
    name: string;
    quantity: number;
    bin: { id: string; number: number; label: string | null; shelf: { id: string; name: string } } | null;
    resourceCategory: { id: string; name: string } | null;
    checkouts: { id: string; returnedAt: string | null; checkedOutAt: string; teacher: { name: string } }[];
  } | null;
  checkouts: Checkout[];
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { confirm, ConfirmDialogHost } = useConfirm();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    fetch(`/api/books/${params.id}`)
      .then((r) => r.json())
      .then(setBook)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    const ok = await confirm({ title: "Delete book?", description: "This cannot be undone.", confirmText: "Delete" });
    if (!ok) return;
    await fetch(`/api/books/${params.id}`, { method: "DELETE" });
    router.push("/books");
  };

  const handleStatusChange = async (newStatus: "available" | "lost" | "damaged") => {
    if (newStatus === "lost") {
      const ok = await confirm({ title: "Mark as Lost?", description: "This book will be marked as lost and become unavailable for checkout.", confirmText: "Mark Lost" });
      if (!ok) return;
    }
    const res = await fetch(`/api/books/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, statusNote: newStatus === "available" ? null : statusNote }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBook((b) => b ? { ...b, status: updated.status, statusNote: updated.statusNote } : b);
      setStatusNote("");
      toast.success(newStatus === "available" ? "Book restored to available." : `Book marked as ${newStatus}.`);
    } else {
      toast.error("Failed to update status");
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!book) return <div className="text-center py-12 text-red-500">Book not found</div>;

  const activeCheckouts = book.checkouts.filter((c) => !c.returnedAt);
  const pastCheckouts = book.checkouts.filter((c) => c.returnedAt);

  return (
    <div className="space-y-6">
      <ConfirmDialogHost />
      <Link href="/books" className="text-indigo-600 hover:underline text-sm">← Back to books</Link>

      <div className="bg-white border rounded-xl p-6">
        <div className="flex gap-6">
          <div className="w-32 h-40 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
            {book.coverImageUrl ? (
              <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">📕</div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
            <p className="text-lg text-gray-600 mt-1">{book.author}</p>
            {book.isbn && <p className="text-sm text-gray-400 mt-1">ISBN: {book.isbn}</p>}

            <div className="flex gap-2 mt-3 flex-wrap">
              {book.qualifier && (
                <span className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full">
                  {book.qualifier.name}
                </span>
              )}
              {book.category && (
                <span className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full">
                  {book.category.name}
                </span>
              )}
              {book.status === "lost" && (
                <span className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-full font-medium">🔍 Lost</span>
              )}
              {book.status === "damaged" && (
                <span className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-full font-medium">🔧 Damaged</span>
              )}
              {book.status === "available" && (
                <span className={`px-3 py-1 text-sm rounded-full ${
                  book.availableCopies > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {book.availableCopies}/{book.totalCopies} available
                </span>
              )}
            </div>

            {book.statusNote && (
              <p className="mt-1 text-sm text-gray-500 italic">Note: {book.statusNote}</p>
            )}

            {book.resource ? (
              <div className="mt-2 text-sm text-gray-500">
                📦 Part of resource: <span className="font-medium text-gray-700">{book.resource.name}</span>
                {book.resource.bin && (
                  <> — {book.resource.bin.shelf.name} → {book.resource.bin.label || `Bin ${book.resource.bin.number}`}</>
                )}
              </div>
            ) : book.bin ? (
              <div className="mt-2 text-sm text-gray-500">
                📍 {book.bin.shelf.name} → {book.bin.label || `Bin ${book.bin.number}`}
                {book.category && <> → {book.category.name}</>}
              </div>
            ) : null}

            <div className="flex gap-2 mt-4 flex-wrap">
              <Link
                href={`/books/${book.id}/edit`}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                Edit
              </Link>
              {!book.resource && book.availableCopies > 0 && book.status === "available" && (
                <Link
                  href={`/checkout?bookId=${book.id}`}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Check Out
                </Link>
              )}
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
              >
                Delete
              </button>
            </div>

            {/* Status management */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Item Status</p>
              {book.status !== "available" && (
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Optional note (reason, details...)"
                  className="w-full mb-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              )}
              <div className="flex gap-2 flex-wrap">
                {book.status !== "lost" && (
                  <button onClick={() => handleStatusChange("lost")} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">🔍 Mark Lost</button>
                )}
                {book.status !== "damaged" && (
                  <button onClick={() => handleStatusChange("damaged")} className="px-3 py-1.5 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 font-medium">🔧 Mark Damaged</button>
                )}
                {book.status !== "available" && (
                  <button onClick={() => handleStatusChange("available")} className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium">✅ Restore Available</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resource checkout info for resource-attached books */}
      {book.resource && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <h2 className="font-semibold text-purple-800 mb-3">
            📦 Resource: {book.resource.name}
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            This book&apos;s availability is managed through its parent resource.
            {book.resource.resourceCategory && <> Theme: <span className="font-medium">{book.resource.resourceCategory.name}</span></>}
          </p>
          {(() => {
            const activeResCheckouts = book.resource!.checkouts.filter((c) => !c.returnedAt);
            return activeResCheckouts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-700">
                  {activeResCheckouts.length} of {book.resource!.quantity} checked out:
                </p>
                {activeResCheckouts.map((co) => (
                  <div key={co.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                    <div>
                      <span className="font-medium">{co.teacher.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        since {new Date(co.checkedOutAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600">All copies available</p>
            );
          })()}
        </div>
      )}

      {/* Active checkouts (standalone books only) */}
      {!book.resource && activeCheckouts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <h2 className="font-semibold text-yellow-800 mb-3">Currently Checked Out</h2>
          <div className="space-y-2">
            {activeCheckouts.map((co) => (
              <div key={co.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                <div>
                  <span className="font-medium">{co.teacher.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    since {new Date(co.checkedOutAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checkout history */}
      {pastCheckouts.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Checkout History</h2>
          <div className="space-y-2">
            {pastCheckouts.map((co) => (
              <div key={co.id} className="flex justify-between items-center text-sm text-gray-600">
                <span>{co.teacher.name}</span>
                <span>
                  {new Date(co.checkedOutAt).toLocaleDateString()} → {new Date(co.returnedAt!).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
