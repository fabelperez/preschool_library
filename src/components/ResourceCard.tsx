import Link from "next/link";

export interface ResourceCardProps {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  availableQuantity: number;
  themeName?: string | null;
  categoryName?: string | null;
  locationPath?: string | null;
  checkedOutBy?: { teacherName: string; checkedOutAt: string }[];
  /** "compact" = smaller card for search results; "full" = standard list card */
  variant?: "full" | "compact";
}

export default function ResourceCard({
  id,
  name,
  description,
  quantity,
  availableQuantity,
  themeName,
  categoryName,
  locationPath,
  checkedOutBy = [],
  variant = "full",
}: ResourceCardProps) {
  const available = availableQuantity > 0;

  if (variant === "compact") {
    return (
      <Link
        href={`/resources/${id}`}
        className="block p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all bg-white"
      >
        <div className="min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{name}</p>
          {description && (
            <p className="text-xs text-gray-500 truncate">{description}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {themeName && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">
                🎨 {themeName}
              </span>
            )}
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                available
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {availableQuantity}/{quantity}
            </span>
            {locationPath && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                📍 {locationPath}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Full variant — standard list card
  return (
    <Link
      href={`/resources/${id}`}
      className="block bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{name}</h3>
          {description && (
            <p className="text-sm text-gray-500 mt-1 truncate">{description}</p>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            {categoryName && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                {categoryName}
              </span>
            )}
            {themeName && (
              <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-600 rounded-full">
                🎨 {themeName}
              </span>
            )}
            {locationPath && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                📍 {locationPath}
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
        <div className="flex-shrink-0 ml-4 text-right">
          <span
            className={`text-sm font-medium px-3 py-1 rounded-full ${
              available
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {availableQuantity}/{quantity} available
          </span>
        </div>
      </div>
    </Link>
  );
}
