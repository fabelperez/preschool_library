import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCheckedOutThemeIds } from "@/lib/checkout-rules";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const resourceCategoryId = searchParams.get("resourceCategoryId") || "";

  // Look up theme name for bin-level matching
  let themeName: string | null = null;
  if (resourceCategoryId) {
    const themeCategory = await prisma.resourceCategory.findUnique({
      where: { id: resourceCategoryId },
      select: { name: true },
    });
    themeName = themeCategory?.name || null;
  }

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

  // Theme filter: books linked to resource with theme, directly tagged, or in themed bin
  if (resourceCategoryId) {
    const themeConditions: Record<string, unknown>[] = [
      { resource: { resourceCategoryId } },
      { resourceCategoryId },
    ];
    if (themeName) {
      themeConditions.push({ bin: { theme: themeName } });
    }

    if (bookWhere.OR) {
      const textConditions = bookWhere.OR;
      delete bookWhere.OR;
      bookWhere.AND = [
        { OR: textConditions },
        { OR: themeConditions },
      ];
    } else {
      bookWhere.OR = themeConditions;
    }
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
  const [books, resources, categories, resourceCategories, shelfSections] = await Promise.all([
    prisma.book.findMany({
      where: bookWhere,
      include: {
        category: true,
        qualifier: true,
        resourceCategory: true,
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
    prisma.shelfSection.findMany({
      include: { shelf: { select: { name: true } }, category: { select: { name: true } } },
    }),
  ]);

  // Build category → shelf location map for books without a bin
  const categoryShelfMap = new Map<string, string>();
  for (const section of shelfSections) {
    if (!categoryShelfMap.has(section.categoryId)) {
      categoryShelfMap.set(
        section.categoryId,
        [section.shelf.name, section.label || section.category.name].filter(Boolean).join(" › ")
      );
    }
  }

  // Get themes with active checkouts for availability computation
  const checkedOutThemes = await getCheckedOutThemeIds();

  // Compute book availability (always based on canonical book copy count)
  const booksWithAvailability = books.map((book) => {
    const isTeacherResource = !!book.resource;
    const bookThemeCatId = book.resourceCategoryId || book.resource?.resourceCategoryId || null;
    const themeCheckedOut = bookThemeCatId ? checkedOutThemes.has(bookThemeCatId) : false;
    const availableCopies = themeCheckedOut ? 0 : Math.max(0, book.totalCopies - book.checkouts.length - (book.lostCopies ?? 0) - (book.damagedCopies ?? 0));
    const themeName = book.resource?.resourceCategory?.name
      || book.resourceCategory?.name
      || (book.bin?.theme && book.bin.theme !== "General" ? book.bin.theme : null)
      || null;
    const bin = book.bin || book.resource?.bin;
    const locationPath = bin
      ? [bin.shelf?.name || "?", bin.label || `Bin ${bin.number}`, ...(themeName ? [themeName] : [])].join(" › ")
      : (book.categoryId ? categoryShelfMap.get(book.categoryId) ?? null : null);

    return {
      ...book,
      resultType: "book" as const,
      isTeacherResource,
      themeName,
      locationPath,
      availableCopies,
      themeCheckedOut,
      checkedOutBy: book.checkouts.map((c) => ({
        teacherName: c.teacher.name,
        checkedOutAt: c.checkedOutAt,
      })),
    };
  });

  // Compute resource availability (theme checkout → 0 available)
  const resourcesWithAvailability = resources.map((r) => {
    const themeName = r.resourceCategory?.name || null;
    const themeCheckedOut = r.resourceCategoryId ? checkedOutThemes.has(r.resourceCategoryId) : false;
    const bin = r.bin;
    const locationPath = bin
      ? [bin.shelf?.name || "?", bin.label || `Bin ${bin.number}`, ...(themeName ? [themeName] : [])].join(" › ")
      : null;

    return {
      ...r,
      resultType: "resource" as const,
      themeName,
      locationPath,
      themeCheckedOut,
      availableQuantity: (r.status === "lost" || r.status === "damaged") ? 0 : (themeCheckedOut ? 0 : r.quantity - r.checkouts.length),
      checkedOutBy: r.checkouts.map((c) => ({
        teacherName: c.teacher.name,
        checkedOutAt: c.checkedOutAt,
      })),
    };
  });

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
