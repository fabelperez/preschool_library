"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hasRole, setHasRole] = useState<boolean | null>(null);

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    if (role) {
      setHasRole(true);
    } else {
      setHasRole(false);
      router.replace("/");
    }
  }, [router]);

  if (hasRole === null) {
    return <div className="text-center py-12 text-gray-500">Loading…</div>;
  }

  if (!hasRole) return null;

  return <>{children}</>;
}
