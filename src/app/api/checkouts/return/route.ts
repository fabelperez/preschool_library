import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutId, isbn } = body;

    if (checkoutId) {
      const checkout = await prisma.checkout.update({
        where: { id: checkoutId },
        data: { returnedAt: new Date() },
        include: { book: true, resourceCategory: true, teacher: true },
      });
      return NextResponse.json(checkout);
    }

    if (isbn) {
      // Return by ISBN - find the oldest active book checkout for this ISBN
      const book = await prisma.book.findUnique({ where: { isbn } });
      if (!book) {
        return NextResponse.json({ error: "Book not found" }, { status: 404 });
      }

      const activeCheckout = await prisma.checkout.findFirst({
        where: { bookId: book.id, returnedAt: null, type: "BOOK" },
        orderBy: { checkedOutAt: "asc" },
      });

      if (!activeCheckout) {
        return NextResponse.json({ error: "No active checkout found for this book" }, { status: 400 });
      }

      const checkout = await prisma.checkout.update({
        where: { id: activeCheckout.id },
        data: { returnedAt: new Date() },
        include: { book: true, teacher: true },
      });

      return NextResponse.json(checkout);
    }

    return NextResponse.json({ error: "checkoutId or isbn is required" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to return item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
