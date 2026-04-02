"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/components/RoleProvider";

interface Teacher {
  id: string;
  name: string;
}

export default function CoverPage() {
  const router = useRouter();
  const { setRole, setTeacher } = useRole();
  const [step, setStep] = useState<"role" | "teacher">("role");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const handleLibrarian = () => {
    setRole("librarian");
    router.push("/admin");
  };

  const handleTeacherStep = () => {
    setStep("teacher");
    setLoadingTeachers(true);
    fetch("/api/teachers")
      .then((r) => r.json())
      .then(setTeachers)
      .catch(console.error)
      .finally(() => setLoadingTeachers(false));
  };

  const handleTeacherConfirm = () => {
    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    if (!teacher) return;
    setRole("teacher");
    setTeacher(teacher.id, teacher.name);
    router.push("/browse");
  };

  // Reset selection when going back
  useEffect(() => {
    if (step === "role") setSelectedTeacherId("");
  }, [step]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center space-y-8 max-w-lg mx-auto">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">📚 Little Library</h1>
          <p className="text-lg text-gray-500">
            {step === "role"
              ? "Welcome! How are you using the library today?"
              : "Which teacher are you?"}
          </p>
        </div>

        {step === "role" && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleLibrarian}
              className="flex-1 p-8 bg-indigo-50 border-2 border-indigo-200 rounded-2xl hover:bg-indigo-100 hover:border-indigo-400 transition-all group"
            >
              <div className="text-5xl mb-3">📖</div>
              <div className="text-xl font-bold text-indigo-800 group-hover:text-indigo-900">Librarian</div>
              <p className="text-sm text-indigo-500 mt-1">Manage books, shelves &amp; checkouts</p>
            </button>

            <button
              onClick={handleTeacherStep}
              className="flex-1 p-8 bg-green-50 border-2 border-green-200 rounded-2xl hover:bg-green-100 hover:border-green-400 transition-all group"
            >
              <div className="text-5xl mb-3">👩‍🏫</div>
              <div className="text-xl font-bold text-green-800 group-hover:text-green-900">Teacher</div>
              <p className="text-sm text-green-500 mt-1">Browse catalog &amp; submit books</p>
            </button>
          </div>
        )}

        {step === "teacher" && (
          <div className="space-y-4 max-w-sm mx-auto">
            <button
              onClick={() => setStep("role")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to role selection
            </button>

            {loadingTeachers ? (
              <p className="text-gray-400 py-4">Loading teachers…</p>
            ) : (
              <>
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 space-y-4">
                  <div className="text-4xl">👩‍🏫</div>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                  >
                    <option value="">Pick your name…</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleTeacherConfirm}
                    disabled={!selectedTeacherId}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-lg disabled:opacity-40"
                  >
                    Let&apos;s Go! 🎉
                  </button>
                </div>

                {teachers.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No teachers registered yet — ask your librarian to add you!
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
