"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (status === "loading") return;
    if (!session || role !== "admin") {
      router.replace("/login");
    }
  }, [session, status, role, router]);

  if (status === "loading") {
    return <div className="text-center py-12 text-gray-500">Loading…</div>;
  }

  if (!session || role !== "admin") {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-bold text-red-600 mb-2">🔒 Access Denied</h1>
        <p className="text-gray-500">You must be an admin to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
