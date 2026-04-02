import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkBookThemeRestriction, getActiveThemeCheckout } from "@/lib/checkout-rules";

export async function GET() {
  const checkouts = await prisma.checkout.findMany({
    where: { returnedAt: null },
    include: {
      book: { include: { category: true } },
      resourceCategory: true,
      teacher: true,
    },
    orderBy: { checkedOutAt: "desc" },
  });

  return NextResponse.json(checkouts);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = "BOOK", bookId, isbn, resourceCategoryId, teacherId } = body;

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 });
    }

    // --- Theme checkout ---
    if (type === "THEME") {
      if (!resourceCategoryId) {
        return NextResponse.json({ error: "Resource Category ID is required for theme checkout" }, { status: 400 });
      }

      const category = await prisma.resourceCategory.findUnique({ where: { id: resourceCategoryId } });
      if (!category) {
        return NextResponse.json({ error: "Theme not found" }, { status: 404 });
      }

      const existing = await getActiveThemeCheckout(resourceCategoryId);
      if (existing) {
        return NextResponse.json(
          { error: `Theme "${category.name}" is already checked out by ${existing.teacher.name}` },
          { status: 400 }
        );
      }

      const checkout = await prisma.checkout.create({
        data: { type: "THEME", resourceCategoryId, teacherId },
        include: { resourceCategory: true, teacher: true },
      });

      return NextResponse.json(checkout, { status: 201 });
    }

    // --- Book checkout ---
    // Resolve ISBN to bookId if needed
    let resolvedBookId = bookId;
    if (!resolvedBookId && isbn) {
      const bookByIsbn = await prisma.book.findUnique({ where: { isbn } });
      if (!bookByIsbn) {
        return NextResponse.json({ error: `No book found with ISBN ${isbn}` }, { status: 404 });
      }
      resolvedBookId = bookByIsbn.id;
    }

    if (!resolvedBookId) {
      return NextResponse.json({ error: "Book ID or ISBN is required" }, { status: 400 });
    }

    // Check TR theme restriction
    const restriction = await checkBookThemeRestriction(resolvedBookId);
    if (restriction.blocked) {
      const msg = restriction.reason === "theme_checked_out"
        ? `This book is part of the "${restriction.themeName}" Teacher Resource theme, currently checked out by ${restriction.teacherName}. Admin approval is required to check out individual items from a theme.`
        : `This book belongs to a Teacher Resource theme. Admin approval is required to check out individual items from a theme.`;
      return NextResponse.json({ error: msg, restriction }, { status: 403 });
    }

    // Check availability
    const book = await prisma.book.findUnique({
      where: { id: resolvedBookId },
      include: { checkouts: { where: { returnedAt: null, type: "BOOK" } } },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const availableCopies = book.totalCopies - book.checkouts.length;
    if (availableCopies <= 0) {
      return NextResponse.json({ error: "No copies available" }, { status: 400 });
    }

    const checkout = await prisma.checkout.create({
      data: { type: "BOOK", bookId: resolvedBookId, teacherId },
      include: { book: true, teacher: true },
    });

    return NextResponse.json(checkout, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
