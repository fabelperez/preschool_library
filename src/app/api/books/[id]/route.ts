import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const book = await prisma.book.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      qualifier: true,
      bin: { include: { shelf: { select: { id: true, name: true } } } },
      resource: {
        include: {
          checkouts: { include: { teacher: true }, orderBy: { checkedOutAt: "desc" } },
          bin: { include: { shelf: { select: { id: true, name: true } } } },
          resourceCategory: true,
        },
      },
      checkouts: {
        include: { teacher: true },
        orderBy: { checkedOutAt: "desc" },
      },
    },
  });

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  let availableCopies: number;
  if (book.resource) {
    const activeResourceCheckouts = book.resource.checkouts.filter((c) => !c.returnedAt);
    availableCopies = Math.max(0, book.resource.quantity - activeResourceCheckouts.length);
  } else {
    availableCopies = book.totalCopies - book.checkouts.filter((c) => !c.returnedAt).length;
  }

  return NextResponse.json({ ...book, availableCopies });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { title, author, isbn, coverImageUrl, totalCopies, categoryId, qualifierId, binId, resourceId } = body;

    const book = await prisma.book.update({
      where: { id: params.id },
      data: {
        title,
        author,
        isbn: isbn || null,
        coverImageUrl: coverImageUrl || null,
        totalCopies,
        categoryId: categoryId || null,
        qualifierId: qualifierId || null,
        binId: binId || null,
        resourceId: resourceId || null,
      },
      include: { category: true, qualifier: true, bin: true, resource: true },
    });

    return NextResponse.json(book);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.book.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete book";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
