import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCheckedOutThemeIds } from "@/lib/checkout-rules";

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
      resourceCategory: true,
      checkouts: {
        include: { teacher: true },
        orderBy: { checkedOutAt: "desc" },
      },
    },
  });

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const checkedOutThemes = await getCheckedOutThemeIds();
  const bookThemeCatId = book.resourceCategoryId || book.resource?.resourceCategoryId || null;
  const themeCheckedOut = bookThemeCatId ? checkedOutThemes.has(bookThemeCatId) : false;

  const activeCheckouts = book.checkouts.filter((c) => !c.returnedAt).length;
  const availableCopies = themeCheckedOut
    ? 0
    : Math.max(0, book.totalCopies - activeCheckouts - book.lostCopies - book.damagedCopies);

  return NextResponse.json({ ...book, availableCopies, themeCheckedOut });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { title, author, isbn, coverImageUrl, totalCopies, categoryId, qualifierId, binId, resourceId, resourceCategoryId } = body;

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
        resourceCategoryId: resourceCategoryId || null,
      },
      include: { category: true, qualifier: true, bin: true, resource: true, resourceCategory: true },
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { lostCopies, damagedCopies, statusNote } = body;

    const book = await prisma.book.findUnique({ where: { id: params.id }, select: { totalCopies: true } });
    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

    const lost = Math.max(0, Math.min(Number(lostCopies ?? 0), book.totalCopies));
    const damaged = Math.max(0, Math.min(Number(damagedCopies ?? 0), book.totalCopies - lost));

    const updated = await prisma.book.update({
      where: { id: params.id },
      data: {
        lostCopies: lost,
        damagedCopies: damaged,
        statusNote: statusNote ?? null,
        statusUpdatedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update book status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
