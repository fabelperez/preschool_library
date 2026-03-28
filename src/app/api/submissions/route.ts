import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSubmissionEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (status) {
    where.status = status;
  }

  const submissions = await prisma.bookSubmission.findMany({
    where,
    include: { teacher: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(submissions);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { isbn, title, author, coverImageUrl, totalCopies, notes, teacherId } = body;

    if (!title || !author || !teacherId) {
      return NextResponse.json(
        { error: "Title, author, and teacher are required" },
        { status: 400 }
      );
    }

    const submission = await prisma.bookSubmission.create({
      data: {
        isbn: isbn || null,
        title,
        author,
        coverImageUrl: coverImageUrl || null,
        totalCopies: totalCopies || 1,
        notes: notes || null,
        teacherId,
      },
      include: { teacher: true },
    });

    // Send email notification to admin (fire and forget)
    sendSubmissionEmail(submission).catch(console.error);

    return NextResponse.json(submission, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create submission";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
