import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      checkouts: {
        where: { returnedAt: null },
        include: { teacher: true },
      },
    },
    orderBy: { title: "asc" },
  });

  const booksWithAvailability = books.map((book) => ({
    ...book,
    availableCopies: book.totalCopies - book.checkouts.length,
    checkedOutBy: book.checkouts.map((c) => ({
      teacherName: c.teacher.name,
      checkedOutAt: c.checkedOutAt,
    })),
  }));

  return NextResponse.json(booksWithAvailability);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isbn, title, author, coverImageUrl, totalCopies, categoryId, qualifierId, binId } = body;

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
      },
      include: { category: true, qualifier: true, bin: true },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
