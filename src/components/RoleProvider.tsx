"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { type Role, canAccess, isPublicRoute } from "@/lib/permissions";

interface RoleContextValue {
  role: Role | null;
  teacherId: string | null;
  teacherName: string | null;
  setRole: (role: Role) => void;
  setTeacher: (id: string, name: string) => void;
  clearRole: () => void;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  teacherId: null,
  teacherName: null,
  setRole: () => {},
  setTeacher: () => {},
  clearRole: () => {},
});

export const useRole = () => useContext(RoleContext);

export default function RoleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [teacherId, setTeacherIdState] = useState<string | null>(null);
  const [teacherName, setTeacherNameState] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Hydrate from sessionStorage once on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("role") as Role | null;
    const storedTeacherId = sessionStorage.getItem("teacherId");
    const storedTeacherName = sessionStorage.getItem("teacherName");
    setRoleState(stored);
    setTeacherIdState(storedTeacherId);
    setTeacherNameState(storedTeacherName);
    setInitialized(true);
  }, []);

  const setRole = useCallback((newRole: Role) => {
    sessionStorage.setItem("role", newRole);
    setRoleState(newRole);
  }, []);

  const setTeacher = useCallback((id: string, name: string) => {
    sessionStorage.setItem("teacherId", id);
    sessionStorage.setItem("teacherName", name);
    setTeacherIdState(id);
    setTeacherNameState(name);
  }, []);

  const clearRole = useCallback(() => {
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("teacherId");
    sessionStorage.removeItem("teacherName");
    setRoleState(null);
    setTeacherIdState(null);
    setTeacherNameState(null);
  }, []);

  // Redirect when role doesn't match route
  useEffect(() => {
    if (!initialized) return;
    if (!canAccess(pathname, role)) {
      router.replace("/");
    }
  }, [pathname, role, initialized, router]);

  // Before hydration: show public routes immediately, loading otherwise
  if (!initialized) {
    return (
      <RoleContext.Provider
        value={{ role, teacherId, teacherName, setRole, setTeacher, clearRole }}
      >
        {isPublicRoute(pathname) ? (
          children
        ) : (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        )}
      </RoleContext.Provider>
    );
  }

  // After hydration: block unauthorized routes
  const allowed = canAccess(pathname, role);

  return (
    <RoleContext.Provider
      value={{ role, teacherId, teacherName, setRole, setTeacher, clearRole }}
    >
      {allowed ? children : null}
    </RoleContext.Provider>
  );
}
