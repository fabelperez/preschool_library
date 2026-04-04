import Link from "next/link";

type BookPreview = {
  type: "book";
  bookId: string;
  title: string;
  author: string;
  availableCopies: number;
  totalCopies: number;
  categoryName?: string | null;
};

type ResourcePreview = {
  type: "resource";
  name: string;
  description?: string | null;
  availableCopies: number;
  totalCopies: number;
  categoryName?: string | null;
};

export type ShelfItemPreviewProps = BookPreview | ResourcePreview;

export default function ShelfItemPreview(props: ShelfItemPreviewProps) {
  const isAvailable = props.availableCopies > 0;
  const title = props.type === "book" ? props.title : props.name;
  const subtitle =
    props.type === "book" ? props.author : (props.categoryName ?? null);

  return (
    <div className="px-3 py-2.5 bg-gray-50 border-t border-gray-200 space-y-1.5">
      {/* Title + author/creator */}
      <div>
        <p className="text-sm font-medium text-gray-800 leading-snug">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      {/* Type + availability + category badges */}
      <div className="flex flex-wrap gap-1.5">
        {props.type === "book" ? (
          <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-medium">
            📕 Book
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
            📦 Resource
          </span>
        )}
        <span
          className={`px-2 py-0.5 text-xs rounded-full font-medium ${
            isAvailable
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {props.availableCopies}/{props.totalCopies} available
        </span>
        {props.type === "book" && props.categoryName && (
          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
            {props.categoryName}
          </span>
        )}
      </div>

      {/* Full description — resources only */}
      {props.type === "resource" && props.description && (
        <p className="text-xs text-gray-600 line-clamp-2">{props.description}</p>
      )}

      {/* View details link — books only */}
      {props.type === "book" && (
        <Link
          href={`/books/${props.bookId}`}
          className="inline-block text-xs text-indigo-600 hover:underline"
        >
          View details →
        </Link>
      )}
    </div>
  );
}
