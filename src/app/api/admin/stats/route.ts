import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BOOK_DUE_DAYS = 14;
const RESOURCE_DUE_DAYS = 7;

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
    allActiveCheckouts,
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
    // Fetch all active checkouts to compute overdue/due-soon counts
    prisma.checkout.findMany({
      where: { returnedAt: null },
      select: { checkedOutAt: true, type: true },
    }),
  ]);

  const now = new Date();
  let overdueCount = 0;
  let dueSoonCount = 0;

  for (const co of allActiveCheckouts) {
    const dueDays = co.type === "BOOK" ? BOOK_DUE_DAYS : RESOURCE_DUE_DAYS;
    const dueDate = new Date(co.checkedOutAt);
    dueDate.setDate(dueDate.getDate() + dueDays);
    const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) overdueCount++;
    else if (daysLeft <= 3) dueSoonCount++;
  }

  return NextResponse.json({
    totalBooks,
    totalResources,
    totalTeachers,
    pendingSubmissions,
    activeBookCheckouts,
    activeThemeCheckouts,
    totalShelves,
    totalCategories,
    overdueCount,
    dueSoonCount,
    recentCheckouts,
    recentSubmissions,
  });
}
