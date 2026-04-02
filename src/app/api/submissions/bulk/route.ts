import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ids, categoryId, rejectReason } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "At least one submission ID is required" }, { status: 400 });
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'" }, { status: 400 });
    }

    // Fetch all targeted submissions
    const submissions = await prisma.bookSubmission.findMany({
      where: { id: { in: ids }, status: "pending" },
    });

    if (submissions.length === 0) {
      return NextResponse.json({ error: "No pending submissions found for the given IDs" }, { status: 404 });
    }

    if (action === "approve") {
      const result = await prisma.$transaction(async (tx) => {
        const books = [];
        for (const sub of submissions) {
          const book = await tx.book.create({
            data: {
              isbn: sub.isbn,
              title: sub.title,
              author: sub.author,
              coverImageUrl: sub.coverImageUrl,
              totalCopies: sub.totalCopies,
              categoryId: categoryId || null,
            },
          });
          books.push(book);
        }

        await tx.bookSubmission.updateMany({
          where: { id: { in: submissions.map((s) => s.id) } },
          data: { status: "approved" },
        });

        return { books, count: submissions.length };
      });

      return NextResponse.json({
        message: `${result.count} submission${result.count !== 1 ? "s" : ""} approved`,
        count: result.count,
      });
    }

    // Reject
    await prisma.bookSubmission.updateMany({
      where: { id: { in: submissions.map((s) => s.id) } },
      data: { status: "rejected", rejectReason: rejectReason || null },
    });

    return NextResponse.json({
      message: `${submissions.length} submission${submissions.length !== 1 ? "s" : ""} rejected`,
      count: submissions.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bulk action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
