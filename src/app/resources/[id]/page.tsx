"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ResourceCheckout {
  id: string;
  checkedOutAt: string;
  returnedAt: string | null;
  teacher: { id: string; name: string };
}

interface Resource {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  availableQuantity: number;
  resourceCategory: { id: string; name: string };
  bin: {
    id: string;
    number: number;
    label: string | null;
    shelf: { id: string; name: string; type: string };
  };
  checkouts: ResourceCheckout[];
}

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/resources/${params.id}`)
      .then((r) => r.json())
      .then(setResource)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    await fetch(`/api/resources/${params.id}`, { method: "DELETE" });
    router.push("/resources");
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!resource) return <div className="text-center py-12 text-red-500">Resource not found</div>;

  const activeCheckouts = resource.checkouts.filter((c) => !c.returnedAt);
  const pastCheckouts = resource.checkouts.filter((c) => c.returnedAt);

  return (
    <div className="space-y-6">
      <Link href="/resources" className="text-green-600 hover:underline text-sm">← Back to resources</Link>

      <div className="bg-white border rounded-xl p-6">
        <div className="flex gap-6">
          <div className="w-20 h-20 flex-shrink-0 bg-green-100 rounded-lg flex items-center justify-center text-3xl">
            📦
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{resource.name}</h1>
            {resource.description && (
              <p className="text-gray-600 mt-1">{resource.description}</p>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">
                {resource.resourceCategory.name}
              </span>
              <span className={`px-3 py-1 text-sm rounded-full ${
                resource.availableQuantity > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}>
                {resource.availableQuantity}/{resource.quantity} available
              </span>
            </div>

            {/* Location path */}
            <div className="mt-3 text-sm text-gray-500">
              📍 {resource.bin.shelf.name} → {resource.bin.label || `Bin ${resource.bin.number}`} → {resource.resourceCategory.name}
            </div>

            <div className="flex gap-2 mt-4">
              {resource.availableQuantity > 0 && (
                <Link
                  href={`/resources/checkout?resourceId=${resource.id}`}
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
          </div>
        </div>
      </div>

      {activeCheckouts.length > 0 && (
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
