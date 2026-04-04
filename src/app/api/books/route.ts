import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCheckedOutThemeIds } from "@/lib/checkout-rules";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId") || "";

  const where: Record<string, unknown> = {};
  
  if (query) {
    where.OR = [
      { title: { contains: query } },
      { author: { contains: query } },
      { isbn: { contains: query } },
    ];
  }
  
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const books = await prisma.book.findMany({
    where,
    include: {
      category: true,
      qualifier: true,
      bin: { include: { shelf: { select: { id: true, name: true } } } },
      resource: {
        include: {
          checkouts: { where: { returnedAt: null } },
          bin: { include: { shelf: { select: { id: true, name: true } } } },
        },
      },
      resourceCategory: true,
      checkouts: {
        where: { returnedAt: null },
        include: { teacher: true },
      },
    },
    orderBy: { title: "asc" },
  });

  const checkedOutThemes = await getCheckedOutThemeIds();

  const booksWithAvailability = books.map((book) => {
    const bookThemeCatId = book.resourceCategoryId || book.resource?.resourceCategoryId || null;
    const themeCheckedOut = bookThemeCatId ? checkedOutThemes.has(bookThemeCatId) : false;
    let availableCopies: number;
    if (themeCheckedOut) {
      availableCopies = 0;
    } else if (book.resource) {
      availableCopies = Math.max(0, book.resource.quantity - book.resource.checkouts.length);
    } else {
      availableCopies = Math.max(
        0,
        book.totalCopies - book.checkouts.length - book.lostCopies - book.damagedCopies
      );
    }
    return {
      ...book,
      availableCopies,
      themeCheckedOut,
      checkedOutBy: book.checkouts.map((c) => ({
        teacherName: c.teacher.name,
        checkedOutAt: c.checkedOutAt,
      })),
    };
  });

  return NextResponse.json(booksWithAvailability);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isbn, title, author, coverImageUrl, totalCopies, categoryId, qualifierId, binId, resourceId, resourceCategoryId } = body;

    if (!title || !author) {
      return NextResponse.json({ error: "Title and author are required" }, { status: 400 });
    }

    const book = await prisma.book.create({
      data: {
        isbn: isbn || null,
        title,
        author,
        coverImageUrl: coverImageUrl || null,
        totalCopies: totalCopies || 1,
        categoryId: categoryId || null,
        qualifierId: qualifierId || null,
        binId: binId || null,
        resourceId: resourceId || null,
        resourceCategoryId: resourceCategoryId || null,
      },
      include: { category: true, qualifier: true, bin: true, resource: true, resourceCategory: true },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
