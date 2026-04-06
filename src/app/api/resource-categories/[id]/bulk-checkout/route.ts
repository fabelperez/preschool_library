import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkBookThemeRestriction } from "@/lib/checkout-rules";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { teacherId } = await request.json();
    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 });
    }

    const { id: resourceCategoryId } = params;

    // Fetch all books in this theme with availability data and TR-qualifier info
    const books = await prisma.book.findMany({
      where: { resourceCategoryId },
      include: {
        qualifier: { select: { name: true } },
        resource: { select: { id: true } },
        checkouts: { where: { returnedAt: null, type: "BOOK" } },
      },
    });

    if (books.length === 0) {
      return NextResponse.json({ error: "No books are assigned to this theme." }, { status: 400 });
    }

    // Check TR restriction once — all books share the same theme, so the
    // restriction outcome is identical for every TR book in the set.
    const trBook = books.find((b) => b.qualifier?.name === "Teacher Resource" || !!b.resource);
    if (trBook) {
      const restriction = await checkBookThemeRestriction(trBook.id);
      if (restriction.blocked) {
        const msg =
          restriction.reason === "theme_checked_out"
            ? `Books in this theme are part of a Teacher Resource bundle currently checked out by ${restriction.teacherName}. Admin approval is required for individual checkout.`
            : `Books in this theme belong to a Teacher Resource bundle. Admin approval is required for individual checkout.`;
        return NextResponse.json({ error: msg }, { status: 403 });
      }
    }

    // Split into eligible (available copies > 0) and skipped
    const eligible = books.filter(
      (b) => b.totalCopies - b.checkouts.length - b.lostCopies - b.damagedCopies > 0
    );

    if (eligible.length === 0) {
      return NextResponse.json(
        { error: "All books in this theme are currently checked out or unavailable." },
        { status: 400 }
      );
    }

    // Create all checkouts atomically — no partial state on failure
    await prisma.$transaction(
      eligible.map((b) =>
        prisma.checkout.create({
          data: { type: "BOOK", bookId: b.id, teacherId },
        })
      )
    );

    return NextResponse.json({
      checkedOut: eligible.length,
      skipped: books.length - eligible.length,
      total: books.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process bulk checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
