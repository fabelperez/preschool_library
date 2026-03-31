import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    totalBooks,
    totalResources,
    totalTeachers,
    pendingSubmissions,
    activeBookCheckouts,
    activeThemeCheckouts,
    totalShelves,
    totalCategories,
    recentCheckouts,
    recentSubmissions,
  ] = await Promise.all([
    prisma.book.count(),
    prisma.resource.count(),
    prisma.teacher.count(),
    prisma.bookSubmission.count({ where: { status: "pending" } }),
    prisma.checkout.count({ where: { returnedAt: null, type: "BOOK" } }),
    prisma.checkout.count({ where: { returnedAt: null, type: "THEME" } }),
    prisma.shelf.count(),
    prisma.category.count(),
    prisma.checkout.findMany({
      where: { returnedAt: null },
      include: {
        book: { select: { title: true } },
        resourceCategory: { select: { name: true } },
        teacher: { select: { name: true } },
      },
      orderBy: { checkedOutAt: "desc" },
      take: 5,
    }),
    prisma.bookSubmission.findMany({
      where: { status: "pending" },
      include: { teacher: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    totalBooks,
    totalResources,
    totalTeachers,
    pendingSubmissions,
    activeBookCheckouts,
    activeThemeCheckouts,
    totalShelves,
    totalCategories,
    recentCheckouts,
    recentSubmissions,
  });
}
