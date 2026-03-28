import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const teachers = await prisma.teacher.findMany({
    orderBy: { name: "asc" },
    include: {
      checkouts: {
        where: { returnedAt: null },
        include: { book: true },
      },
    },
  });

  return NextResponse.json(teachers);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const teacher = await prisma.teacher.create({
      data: { name, email: email || null },
    });

    return NextResponse.json(teacher, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create teacher";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
