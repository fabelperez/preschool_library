"use client";

import { useRouter } from "next/navigation";

export default function CoverPage() {
  const router = useRouter();

  const selectRole = (role: "librarian" | "teacher") => {
    sessionStorage.setItem("role", role);
    router.push(role === "librarian" ? "/admin" : "/library");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center space-y-8 max-w-lg mx-auto">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">📚 Little Library</h1>
          <p className="text-lg text-gray-500">Welcome! How are you using the library today?</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => selectRole("librarian")}
            className="flex-1 p-8 bg-indigo-50 border-2 border-indigo-200 rounded-2xl hover:bg-indigo-100 hover:border-indigo-400 transition-all group"
          >
            <div className="text-5xl mb-3">📖</div>
            <div className="text-xl font-bold text-indigo-800 group-hover:text-indigo-900">Librarian</div>
            <p className="text-sm text-indigo-500 mt-1">Manage books, shelves &amp; checkouts</p>
          </button>

          <button
            onClick={() => selectRole("teacher")}
            className="flex-1 p-8 bg-green-50 border-2 border-green-200 rounded-2xl hover:bg-green-100 hover:border-green-400 transition-all group"
          >
            <div className="text-5xl mb-3">👩‍🏫</div>
            <div className="text-xl font-bold text-green-800 group-hover:text-green-900">Teacher</div>
            <p className="text-sm text-green-500 mt-1">Browse catalog &amp; submit books</p>
          </button>
        </div>
      </div>
    </div>
  );
}
