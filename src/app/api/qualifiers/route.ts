import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const qualifiers = await prisma.qualifier.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { books: true } },
    },
  });
  return NextResponse.json(qualifiers);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const qualifier = await prisma.qualifier.create({
      data: { name },
    });

    return NextResponse.json(qualifier, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create qualifier";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
