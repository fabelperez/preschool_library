export type Role = "librarian" | "teacher";

// Routes that need no role — anyone can visit
const PUBLIC_ROUTES = ["/", "/login"];

// Route prefixes restricted to librarian only
const LIBRARIAN_PREFIXES = ["/admin"];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}

/**
 * Can the given role access this pathname?
 *  - Public routes → always yes
 *  - Librarian prefixes → librarian only
 *  - Everything else → any role (librarian or teacher)
 */
export function canAccess(pathname: string, role: Role | null): boolean {
  if (isPublicRoute(pathname)) return true;
  if (!role) return false;
  if (LIBRARIAN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return role === "librarian";
  }
  return true;
}
