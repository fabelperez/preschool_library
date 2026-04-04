import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCheckedOutThemeIds } from "@/lib/checkout-rules";

export async function GET(request: NextRequest) {
  try {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const binId = searchParams.get("binId") || "";
  const shelfId = searchParams.get("shelfId") || "";
  const theme = searchParams.get("theme") || "";
  const resourceCategoryId = searchParams.get("resourceCategoryId") || "";

  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [
      { name: { contains: query } },
      { description: { contains: query } },
    ];
  }
  if (binId) where.binId = binId;
  const binFilter: Record<string, unknown> = {};
  if (shelfId) binFilter.shelfId = shelfId;
  if (theme) binFilter.theme = theme;
  if (Object.keys(binFilter).length > 0) where.bin = binFilter;
  if (resourceCategoryId) where.resourceCategoryId = resourceCategoryId;

  // Build matching filter for teacher-resource books in bins
  const bookWhere: Record<string, unknown> = { binId: { not: null } };
  if (query) {
    bookWhere.OR = [
      { title: { contains: query } },
      { author: { contains: query } },
      { isbn: { contains: query } },
    ];
  }
  if (binId) bookWhere.binId = binId;
  if (shelfId) bookWhere.bin = { shelfId };
  if (resourceCategoryId) bookWhere.resourceCategoryId = resourceCategoryId;

  const [resources, teacherBooks] = await Promise.all([
    prisma.resource.findMany({
      where,
      include: {
        resourceCategory: true,
        bin: {
          include: {
            shelf: { select: { id: true, name: true } },
          },
        },
        checkouts: {
          where: { returnedAt: null },
          include: { teacher: true },
        },
      },
      orderBy: [
        { bin: { number: "asc" } },
        { resourceCategory: { name: "asc" } },
        { name: "asc" },
      ],
    }),
    prisma.book.findMany({
      where: bookWhere,
      include: {
        bin: {
          include: {
            shelf: { select: { id: true, name: true } },
          },
        },
        resourceCategory: true,
        category: true,
        checkouts: {
          where: { returnedAt: null },
          include: { teacher: true },
        },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  const checkedOutThemes = await getCheckedOutThemeIds();

  const resourcesWithAvailability = resources.map((r) => {
    const themeCheckedOut = r.resourceCategoryId ? checkedOutThemes.has(r.resourceCategoryId) : false;
    const isUnavailable = r.status === "lost" || r.status === "damaged";
    return {
      ...r,
      themeCheckedOut,
      availableQuantity: isUnavailable ? 0 : (themeCheckedOut ? 0 : r.quantity - r.checkouts.length),
      checkedOutBy: r.checkouts.map((c) => ({
        teacherName: c.teacher.name,
        checkedOutAt: c.checkedOutAt,
      })),
    };
  });

  const teacherBooksWithAvailability = teacherBooks.map((book) => {
    const bookThemeCatId = book.resourceCategoryId;
    const themeCheckedOut = bookThemeCatId ? checkedOutThemes.has(bookThemeCatId) : false;
    return {
      ...book,
      themeCheckedOut,
      availableCopies: themeCheckedOut ? 0 : book.totalCopies - book.checkouts.length,
      checkedOutBy: book.checkouts.map((c) => ({
        teacherName: c.teacher.name,
        checkedOutAt: c.checkedOutAt,
      })),
    };
  });

  return NextResponse.json({
    resources: resourcesWithAvailability,
    teacherBooks: teacherBooksWithAvailability,
  });
  } catch (error) {
    console.error("GET /api/resources error:", error);
    return NextResponse.json({ resources: [], teacherBooks: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, quantity, resourceCategoryId, binId } = body;

    if (!name || !resourceCategoryId || !binId) {
      return NextResponse.json(
        { error: "Name, resource category, and bin are required" },
        { status: 400 }
      );
    }

    const resource = await prisma.resource.create({
      data: {
        name,
        description: description || null,
        quantity: quantity || 1,
        resourceCategoryId,
        binId,
      },
      include: {
        resourceCategory: true,
        bin: { include: { shelf: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create resource";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
