import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import RoleProvider from "@/components/RoleProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Little Library — Preschool Book Catalog",
  description: "A library catalog for managing and checking out preschool books",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        <RoleProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
        </RoleProvider>
      </body>
    </html>
  );
}
