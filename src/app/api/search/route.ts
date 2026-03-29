import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const resourceCategoryId = searchParams.get("resourceCategoryId") || "";

  // --- Build book query ---
  const bookWhere: Record<string, unknown> = {};

  if (query) {
    bookWhere.OR = [
      { title: { contains: query } },
      { author: { contains: query } },
      { isbn: { contains: query } },
    ];
  }

  if (categoryId) {
    bookWhere.categoryId = categoryId;
  }

  // Theme filter: include books linked to resources in the selected theme
  if (resourceCategoryId) {
    bookWhere.resource = {
      resourceCategoryId: resourceCategoryId,
    };
  }

  // --- Build resource query ---
  const resourceWhere: Record<string, unknown> = {};

  if (query) {
    resourceWhere.OR = [
      { name: { contains: query } },
      { description: { contains: query } },
    ];
  }

  if (resourceCategoryId) {
    resourceWhere.resourceCategoryId = resourceCategoryId;
  }

  // Run both queries in parallel
  const [books, resources, categories, resourceCategories] = await Promise.all([
    prisma.book.findMany({
      where: bookWhere,
      include: {
        category: true,
        qualifier: true,
        bin: { include: { shelf: { select: { id: true, name: true } } } },
        resource: {
          include: {
            resourceCategory: true,
            checkouts: { where: { returnedAt: null } },
            bin: { include: { shelf: { select: { id: true, name: true } } } },
          },
        },
        checkouts: {
          where: { returnedAt: null },
          include: { teacher: true },
        },
      },
      orderBy: { title: "asc" },
    }),
    // Skip resource query if filtering by book category only
    categoryId && !resourceCategoryId
      ? Promise.resolve([])
      : prisma.resource.findMany({
          where: resourceWhere,
          include: {
            resourceCategory: true,
            bin: {
              include: { shelf: { select: { id: true, name: true } } },
            },
            checkouts: {
              where: { returnedAt: null },
              include: { teacher: true },
            },
          },
          orderBy: { name: "asc" },
        }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.resourceCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Compute book availability
  const booksWithAvailability = books.map((book) => {
    let availableCopies: number;
    const isTeacherResource = !!book.resource;
    if (book.resource) {
      availableCopies = Math.max(
        0,
        book.resource.quantity - book.resource.checkouts.length
      );
    } else {
      availableCopies = book.totalCopies - book.checkouts.length;
    }
    return {
      ...book,
      resultType: "book" as const,
      isTeacherResource,
      themeName: book.resource?.resourceCategory?.name || null,
      availableCopies,
      checkedOutBy: book.checkouts.map((c) => ({
        teacherName: c.teacher.name,
        checkedOutAt: c.checkedOutAt,
      })),
    };
  });

  // Compute resource availability
  const resourcesWithAvailability = resources.map((r) => ({
    ...r,
    resultType: "resource" as const,
    themeName: r.resourceCategory?.name || null,
    availableQuantity: r.quantity - r.checkouts.length,
    checkedOutBy: r.checkouts.map((c) => ({
      teacherName: c.teacher.name,
      checkedOutAt: c.checkedOutAt,
    })),
  }));

  const generalBooks = booksWithAvailability.filter((b) => !b.isTeacherResource);
  const teacherResourceBooks = booksWithAvailability.filter((b) => b.isTeacherResource);

  return NextResponse.json({
    books: booksWithAvailability,
    resources: resourcesWithAvailability,
    categories,
    resourceCategories,
    counts: {
      totalBooks: booksWithAvailability.length,
      generalBooks: generalBooks.length,
      teacherResourceBooks: teacherResourceBooks.length,
      totalResources: resourcesWithAvailability.length,
    },
  });
}
