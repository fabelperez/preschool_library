"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    if (role === "librarian") {
      setAllowed(true);
    } else {
      setAllowed(false);
      router.replace("/");
    }
  }, [router]);

  if (allowed === null) {
    return <div className="text-center py-12 text-gray-500">Loading…</div>;
  }

  if (!allowed) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-bold text-red-600 mb-2">🔒 Access Denied</h1>
        <p className="text-gray-500">You must be a librarian to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
