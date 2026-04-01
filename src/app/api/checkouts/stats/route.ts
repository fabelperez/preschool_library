import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Top books by checkout count in the time window
  const bookCheckouts = await prisma.checkout.groupBy({
    by: ["bookId"],
    where: {
      type: "BOOK",
      bookId: { not: null },
      checkedOutAt: { gte: since },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  const bookIds = bookCheckouts
    .map((c) => c.bookId)
    .filter(Boolean) as string[];
  const books = await prisma.book.findMany({
    where: { id: { in: bookIds } },
    select: { id: true, title: true, author: true, coverImageUrl: true, category: { select: { name: true } } },
  });
  const bookMap = new Map(books.map((b) => [b.id, b]));

  const topBooks = bookCheckouts
    .filter((c) => c.bookId && bookMap.has(c.bookId))
    .map((c) => ({
      bookId: c.bookId,
      count: c._count.id,
      ...bookMap.get(c.bookId!),
    }));

  // Top themes by checkout count in the time window
  const themeCheckouts = await prisma.checkout.groupBy({
    by: ["resourceCategoryId"],
    where: {
      type: "THEME",
      resourceCategoryId: { not: null },
      checkedOutAt: { gte: since },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  const themeIds = themeCheckouts
    .map((c) => c.resourceCategoryId)
    .filter(Boolean) as string[];
  const themes = await prisma.resourceCategory.findMany({
    where: { id: { in: themeIds } },
    select: { id: true, name: true, _count: { select: { resources: true, books: true } } },
  });
  const themeMap = new Map(themes.map((t) => [t.id, t]));

  const topThemes = themeCheckouts
    .filter((c) => c.resourceCategoryId && themeMap.has(c.resourceCategoryId))
    .map((c) => {
      const theme = themeMap.get(c.resourceCategoryId!)!;
      return {
        resourceCategoryId: c.resourceCategoryId,
        count: c._count.id,
        name: theme.name,
        itemCount: theme._count.resources + theme._count.books,
      };
    });

  // Top resources by checkout count in the time window
  const resourceCheckouts = await prisma.resourceCheckout.groupBy({
    by: ["resourceId"],
    where: {
      checkedOutAt: { gte: since },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  const resourceIds = resourceCheckouts.map((c) => c.resourceId);
  const resources = await prisma.resource.findMany({
    where: { id: { in: resourceIds } },
    select: { id: true, name: true, resourceCategory: { select: { name: true } } },
  });
  const resourceMap = new Map(resources.map((r) => [r.id, r]));

  const topResources = resourceCheckouts
    .filter((c) => resourceMap.has(c.resourceId))
    .map((c) => {
      const resource = resourceMap.get(c.resourceId)!;
      return {
        resourceId: c.resourceId,
        count: c._count.id,
        name: resource.name,
        category: resource.resourceCategory.name,
      };
    });

  return NextResponse.json({ topBooks, topThemes, topResources, days });
}
