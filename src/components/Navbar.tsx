"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/", label: "📚 Library" },
  { href: "/books", label: "📖 Books" },
  { href: "/books/submit", label: "📥 Submit Book" },
  { href: "/checkout", label: "✅ Check Out" },
  { href: "/checkin", label: "↩️ Check In" },
  { href: "/admin/submissions", label: "📋 Submissions" },
  { href: "/admin/shelves", label: "🗄️ Shelves" },
  { href: "/admin/shelves/layout", label: "📐 Room Layout" },
  { href: "/admin/teachers", label: "👩‍🏫 Teachers" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/submissions/pending-count")
      .then((r) => r.json())
      .then((data) => setPendingCount(data.count))
      .catch(() => {});
  }, [pathname]);

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
            <Link href="/" className="text-xl font-bold">
              📚 Little Library
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) =>
              renderLink(link, "px-3 py-2 rounded-md text-sm font-medium transition-colors")
            )}
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
          {navLinks.map((link) =>
            renderLink(link, "block px-4 py-3 text-sm font-medium")
          )}
        </div>
      )}
    </nav>
  );
}
