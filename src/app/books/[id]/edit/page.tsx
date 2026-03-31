"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BookForm from "@/components/BookForm";

export default function EditBookPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState<{
    isbn: string;
    title: string;
    author: string;
    coverImageUrl: string | null;
    totalCopies: number;
    categoryId: string | null;
    resourceCategoryId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/books/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setBook({
          isbn: data.isbn || "",
          title: data.title,
          author: data.author,
          coverImageUrl: data.coverImageUrl,
          totalCopies: data.totalCopies,
          categoryId: data.categoryId,
          resourceCategoryId: data.resourceCategoryId,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSubmit = async (data: {
    isbn: string;
    title: string;
    author: string;
    coverImageUrl: string;
    totalCopies: number;
    categoryId: string;
    resourceCategoryId: string;
  }) => {
    const res = await fetch(`/api/books/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update book");
    }

    router.push(`/books/${params.id}`);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!book) return <div className="text-center py-12 text-red-500">Book not found</div>;

  return (
    <div className="space-y-6">
      <Link href={`/books/${params.id}`} className="text-indigo-600 hover:underline text-sm">
        ← Back to book
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">✏️ Edit Book</h1>
      <BookForm initialData={book} onSubmit={handleSubmit} submitLabel="Update Book" />
    </div>
  );
}
