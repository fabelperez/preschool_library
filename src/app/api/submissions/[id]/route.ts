import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { action, categoryId, rejectReason } = body;

    const submission = await prisma.bookSubmission.findUnique({
      where: { id: params.id },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status !== "pending") {
      return NextResponse.json({ error: "Submission already processed" }, { status: 400 });
    }

    if (action === "approve") {
      // Create the book from the submission
      const book = await prisma.book.create({
        data: {
          isbn: submission.isbn,
          title: submission.title,
          author: submission.author,
          coverImageUrl: submission.coverImageUrl,
          totalCopies: submission.totalCopies,
          categoryId: categoryId || null,
        },
      });

      // Update submission status
      const updated = await prisma.bookSubmission.update({
        where: { id: params.id },
        data: { status: "approved" },
        include: { teacher: true },
      });

      return NextResponse.json({ submission: updated, book });
    }

    if (action === "reject") {
      const updated = await prisma.bookSubmission.update({
        where: { id: params.id },
        data: {
          status: "rejected",
          rejectReason: rejectReason || null,
        },
        include: { teacher: true },
      });

      return NextResponse.json({ submission: updated });
    }

    return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process submission";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
