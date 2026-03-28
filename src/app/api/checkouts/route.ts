import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checkouts = await prisma.checkout.findMany({
    where: { returnedAt: null },
    include: {
      book: { include: { category: true } },
      teacher: true,
    },
    orderBy: { checkedOutAt: "desc" },
  });

  return NextResponse.json(checkouts);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, teacherId } = body;

    if (!bookId || !teacherId) {
      return NextResponse.json({ error: "Book ID and Teacher ID are required" }, { status: 400 });
    }

    // Check availability
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { checkouts: { where: { returnedAt: null } } },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const availableCopies = book.totalCopies - book.checkouts.length;
    if (availableCopies <= 0) {
      return NextResponse.json({ error: "No copies available" }, { status: 400 });
    }

    const checkout = await prisma.checkout.create({
      data: { bookId, teacherId },
      include: { book: true, teacher: true },
    });

    return NextResponse.json(checkout, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to check out book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
