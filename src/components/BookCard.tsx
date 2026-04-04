import Link from "next/link";

const NEW_ARRIVAL_DAYS = 30;

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  coverImageUrl?: string | null;
  categoryName?: string | null;
  totalCopies: number;
  availableCopies: number;
  checkedOutBy?: { teacherName: string; checkedOutAt: string }[];
  shelfLocation?: string;
  lostCopies?: number;
  damagedCopies?: number;
  createdAt?: string | null;
}

export default function BookCard({
  id,
  title,
  author,
  coverImageUrl,
  categoryName,
  totalCopies,
  availableCopies,
  checkedOutBy = [],
  shelfLocation,
  lostCopies = 0,
  damagedCopies = 0,
  createdAt,
}: BookCardProps) {
  const isAvailable = availableCopies > 0;
  const isNew = createdAt
    ? (Date.now() - new Date(createdAt).getTime()) / 86400000 < NEW_ARRIVAL_DAYS
    : false;

  return (
    <Link href={`/books/${id}`} className="block">
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
        <div className="flex gap-4">
          {/* Cover image */}
          <div className="relative w-16 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
            {coverImageUrl ? (
              <img src={coverImageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📕</div>
            )}
            {isNew && (
              <span className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1 leading-4 rounded-br">
                NEW
              </span>
            )}
          </div>

          {/* Book info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
            <p className="text-sm text-gray-600">{author}</p>

            <div className="flex flex-wrap gap-2 mt-2">
              {categoryName && (
                <span className="inline-block px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                  {categoryName}
                </span>
              )}
              {lostCopies > 0 && (
                <span className="inline-block px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full font-medium">
                  🔍 {lostCopies} lost
                </span>
              )}
              {damagedCopies > 0 && (
                <span className="inline-block px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full font-medium">
                  🔧 {damagedCopies} damaged
                </span>
              )}
              <span
                className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                  isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {availableCopies}/{totalCopies} available
              </span>
              {shelfLocation && (
                <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  📍 {shelfLocation}
                </span>
              )}
            </div>

            {checkedOutBy.length > 0 && (
              <div className="mt-2">
                {checkedOutBy.map((co, i) => (
                  <p key={i} className="text-xs text-gray-500">
                    Checked out by {co.teacherName} on{" "}
                    {new Date(co.checkedOutAt).toLocaleDateString()}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
