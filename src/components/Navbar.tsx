"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useRole } from "@/components/RoleProvider";

const teacherLinks = [
  { href: "/library", label: "🏫 Library" },
  { href: "/browse", label: "🔍 Browse & Search" },
  { href: "/checkout", label: "📖 Check Out" },
  { href: "/checkin", label: "📥 Check In" },
  { href: "/my-checkouts", label: "📋 My Checkouts" },
  { href: "/books/submit", label: "✏️ Submit Book" },
];

const librarianPublicLinks = [
  { href: "/library", label: "🏫 Library" },
  { href: "/browse", label: "🔍 Browse & Search" },
  { href: "/checked-out", label: "📊 Checked Out" },
];

const adminLinks = [
  { href: "/admin", label: "🏠 Dashboard" },
  { href: "/admin/checkouts", label: "📋 Active Checkouts" },
  { href: "/admin/submissions", label: "📋 Submissions" },
  { href: "/admin/shelves", label: "🗄️ Shelves" },
  { href: "/admin/resources", label: "📦 Resources" },
  { href: "/admin/shelves/layout", label: "📐 Room Layout" },
  { href: "/admin/teachers", label: "👩‍🏫 Teachers" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { role, teacherName, clearRole } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const isLibrarian = role === "librarian";

  useEffect(() => {
    if (!isLibrarian) return;
    fetch("/api/submissions/pending-count")
      .then((r) => r.json())
      .then((data) => setPendingCount(data.count))
      .catch(() => {});
  }, [pathname, isLibrarian]);

  // Hide navbar on cover page or when no role selected
  if (pathname === "/" || !role) return null;

  const visibleLinks = isLibrarian
    ? [...librarianPublicLinks, ...adminLinks]
    : teacherLinks;

  const handleSwitchRole = () => {
    clearRole();
  };

  const renderLink = (link: { href: string; label: string }, className: string) => {
    const isActive = pathname === link.href;
    const showBadge = link.href === "/admin/submissions" && pendingCount > 0;

    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => setMobileMenuOpen(false)}
        className={`${className} ${isActive ? "bg-indigo-800 text-white" : "text-indigo-100 hover:bg-indigo-500"}`}
      >
        {link.label}
        {showBadge && (
          <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full">
            {pendingCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/library" className="text-xl font-bold">
              📚 Little Library
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-1">
            {isLibrarian ? (
              <>
                {librarianPublicLinks.map((link) =>
                  renderLink(link, "px-3 py-2 rounded-md text-sm font-medium transition-colors")
                )}
                <span className="mx-1 h-6 w-px bg-indigo-400" />
                {adminLinks.map((link) =>
                  renderLink(link, "px-3 py-2 rounded-md text-sm font-medium transition-colors")
                )}
              </>
            ) : (
              visibleLinks.map((link) =>
                renderLink(link, "px-3 py-2 rounded-md text-sm font-medium transition-colors")
              )
            )}
            {teacherName && (
              <span className="px-3 py-2 text-sm font-medium text-indigo-200">
                👩‍🏫 {teacherName}
              </span>
            )}
            <button
              onClick={handleSwitchRole}
              className="px-3 py-2 rounded-md text-sm font-medium text-indigo-200 hover:bg-indigo-500 transition-colors"
            >
              🔄 Switch
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-indigo-500"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-indigo-500">
          {isLibrarian ? (
            <>
              {librarianPublicLinks.map((link) =>
                renderLink(link, "block px-4 py-3 text-sm font-medium")
              )}
              <div className="border-t border-indigo-400 mx-4 my-1" />
              <span className="block px-4 py-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">Admin</span>
              {adminLinks.map((link) =>
                renderLink(link, "block px-4 py-3 text-sm font-medium")
              )}
            </>
          ) : (
            visibleLinks.map((link) =>
              renderLink(link, "block px-4 py-3 text-sm font-medium")
            )
          )}
          {teacherName && (
            <span className="block px-4 py-3 text-sm font-medium text-indigo-200">
              👩‍🏫 {teacherName}
            </span>
          )}
          <button
            onClick={() => { setMobileMenuOpen(false); handleSwitchRole(); }}
            className="block w-full text-left px-4 py-3 text-sm font-medium text-indigo-200 hover:bg-indigo-500"
          >
            🔄 Switch Role
          </button>
        </div>
      )}
    </nav>
  );
}
